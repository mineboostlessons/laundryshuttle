"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { createRefund } from "@/lib/stripe";
import {
  notifyOrderConfirmed,
  notifyOrderCompleted,
  notifyPaymentReceived,
  notifyDriverEnRoute,
  notifyDeliveryCompleted,
  sendNotification,
} from "@/lib/notifications";

// =============================================================================
// List Orders
// =============================================================================

export async function listOrders(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    tenantId: tenant.id,
    ...(params?.status ? { status: params.status } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderType: true,
        totalAmount: true,
        discountAmount: true,
        paymentMethod: true,
        paidAt: true,
        createdAt: true,
        customer: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// =============================================================================
// Get Order Detail
// =============================================================================

export async function getOrderDetail(orderId: string) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  return prisma.order.findFirst({
    where: { id: orderId, tenantId: tenant.id },
    include: {
      items: true,
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          walletBalance: true,
        },
      },
      pickupAddress: {
        select: {
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          zip: true,
          pickupNotes: true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
      promoCode: {
        select: { code: true, discountType: true, discountValue: true },
      },
    },
  });
}

// =============================================================================
// Process Refund
// =============================================================================

const refundSchema = z.object({
  orderId: z.string(),
  amount: z.number().min(0.01).optional(), // omit for full refund
  reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).optional(),
  refundToWallet: z.boolean().optional(),
});

export async function processRefund(input: z.infer<typeof refundSchema>) {
  const session = await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const parsed = refundSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { orderId, amount, reason, refundToWallet } = parsed.data;

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId: tenant.id },
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      stripePaymentIntentId: true,
      paidAt: true,
      status: true,
      customerId: true,
      paymentMethod: true,
    },
  });

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  if (!order.paidAt) {
    return { success: false, error: "Order has not been paid" };
  }

  if (order.status === "refunded") {
    return { success: false, error: "Order has already been fully refunded" };
  }

  const refundAmount = amount ?? order.totalAmount;

  // Refund to wallet (credit balance instead of Stripe refund)
  if (refundToWallet && order.customerId) {
    const user = await prisma.user.findUnique({
      where: { id: order.customerId },
      select: { walletBalance: true },
    });

    if (!user) {
      return { success: false, error: "Customer not found" };
    }

    const newBalance = user.walletBalance + refundAmount;
    const isFullRefund = refundAmount >= order.totalAmount;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: order.customerId },
        data: { walletBalance: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          userId: order.customerId,
          tenantId: tenant.id,
          type: "refund_credit",
          amount: refundAmount,
          balanceAfter: newBalance,
          description: `Refund for order ${order.orderNumber}`,
          orderId: order.id,
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: isFullRefund ? "refunded" : "partially_refunded",
        },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: isFullRefund ? "refunded" : "partially_refunded",
          changedByUserId: session.user.id,
          notes: `Refunded $${refundAmount.toFixed(2)} to wallet`,
        },
      }),
    ]);

    return { success: true, refundType: "wallet", refundAmount };
  }

  // Stripe refund
  if (!order.stripePaymentIntentId) {
    return { success: false, error: "No Stripe payment found for this order. Use wallet refund instead." };
  }

  try {
    await createRefund({
      paymentIntentId: order.stripePaymentIntentId,
      amount: amount, // undefined for full refund
      reason: reason ?? "requested_by_customer",
    });

    const isFullRefund = !amount || amount >= order.totalAmount;

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: isFullRefund ? "refunded" : "partially_refunded",
        },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: isFullRefund ? "refunded" : "partially_refunded",
          changedByUserId: session.user.id,
          notes: `Refunded $${refundAmount.toFixed(2)} via Stripe`,
        },
      }),
    ]);

    return { success: true, refundType: "stripe", refundAmount };
  } catch (error) {
    console.error("Stripe refund error:", error);
    return { success: false, error: "Failed to process refund via Stripe" };
  }
}

// =============================================================================
// Update Order Status (with notification triggers)
// =============================================================================

const VALID_STATUSES = [
  "pending",
  "confirmed",
  "picked_up",
  "processing",
  "ready",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
] as const;

const updateStatusSchema = z.object({
  orderId: z.string(),
  status: z.enum(VALID_STATUSES),
  notes: z.string().optional(),
});

export async function updateOrderStatus(
  input: z.infer<typeof updateStatusSchema>
) {
  const session = await requireRole(UserRole.OWNER, UserRole.MANAGER, UserRole.ATTENDANT);
  const tenant = await requireTenant();

  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0].message };
  }

  const { orderId, status, notes } = parsed.data;

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId: tenant.id },
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      customerId: true,
      status: true,
      customer: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  if (!order) {
    return { success: false as const, error: "Order not found" };
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === "completed" && !order.customerId ? { paidAt: new Date() } : {}),
      },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        status,
        changedByUserId: session.user.id,
        notes: notes ?? `Status changed to ${status}`,
      },
    }),
  ]);

  // Send notifications based on status change (fire-and-forget)
  if (order.customerId) {
    const customerName = [order.customer?.firstName, order.customer?.lastName]
      .filter(Boolean)
      .join(" ");

    try {
      switch (status) {
        case "confirmed":
          notifyOrderConfirmed({
            tenantId: tenant.id,
            userId: order.customerId,
            orderNumber: order.orderNumber,
            total: order.totalAmount,
            customerName,
          });
          break;

        case "out_for_delivery":
          notifyDriverEnRoute({
            tenantId: tenant.id,
            userId: order.customerId,
            orderNumber: order.orderNumber,
          });
          break;

        case "delivered":
          notifyDeliveryCompleted({
            tenantId: tenant.id,
            userId: order.customerId,
            orderNumber: order.orderNumber,
          });
          break;

        case "completed":
          notifyOrderCompleted({
            tenantId: tenant.id,
            userId: order.customerId,
            orderNumber: order.orderNumber,
            total: order.totalAmount,
            customerName,
          });
          break;

        case "cancelled":
          sendNotification({
            tenantId: tenant.id,
            userId: order.customerId,
            event: "order_cancelled",
            variables: {
              orderNumber: order.orderNumber,
              customerName,
              reason: notes ?? "",
            },
          });
          break;
      }
    } catch (err) {
      // Non-blocking — don't fail the status update if notification fails
      console.error("Failed to send status notification:", err);
    }
  }

  return { success: true as const };
}
