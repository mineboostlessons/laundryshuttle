"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { chargeStoredCard } from "@/lib/stripe";
import { sendNotification } from "@/lib/notifications";

// =============================================================================
// Attendant Dashboard Data
// =============================================================================

export async function getAttendantDashboardData() {
  const session = await requireRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ATTENDANT
  );
  const tenant = await requireTenant();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    incomingOrders,
    processingOrders,
    readyOrders,
    todayCompleted,
    laundromats,
  ] = await Promise.all([
    // Orders waiting to be processed (picked_up or confirmed walk-ins)
    prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        status: { in: ["picked_up", "confirmed"] },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderType: true,
        numBags: true,
        totalWeightLbs: true,
        binNumber: true,
        specialInstructions: true,
        preferencesSnapshot: true,
        createdAt: true,
        customer: {
          select: { firstName: true, lastName: true },
        },
        items: {
          select: { name: true, quantity: true },
        },
      },
    }),

    // Orders currently being processed
    prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        status: "processing",
      },
      orderBy: { updatedAt: "asc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderType: true,
        numBags: true,
        totalWeightLbs: true,
        binNumber: true,
        washerNumber: true,
        dryerNumber: true,
        specialInstructions: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: { firstName: true, lastName: true },
        },
        items: {
          select: { name: true, quantity: true },
        },
      },
    }),

    // Orders ready for pickup/delivery
    prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        status: "ready",
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderType: true,
        binNumber: true,
        createdAt: true,
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
    }),

    // Today's completed
    prisma.order.count({
      where: {
        tenantId: tenant.id,
        status: { in: ["ready", "completed", "delivered", "out_for_delivery"] },
        updatedAt: { gte: todayStart },
      },
    }),

    // Get laundromat equipment info
    prisma.laundromat.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: {
        id: true,
        name: true,
        numWashers: true,
        numDryers: true,
      },
    }),
  ]);

  // Build equipment usage map from processing orders
  const washersInUse = new Set<number>();
  const dryersInUse = new Set<number>();
  for (const order of processingOrders) {
    if (order.washerNumber) washersInUse.add(order.washerNumber);
    if (order.dryerNumber) dryersInUse.add(order.dryerNumber);
  }

  const location = laundromats[0] ?? { numWashers: 0, numDryers: 0 };

  return {
    incomingOrders,
    processingOrders,
    readyOrders,
    todayCompleted,
    equipment: {
      totalWashers: location.numWashers,
      totalDryers: location.numDryers,
      washersInUse: Array.from(washersInUse),
      dryersInUse: Array.from(dryersInUse),
    },
  };
}

// =============================================================================
// Start Processing Order
// =============================================================================

const startProcessingSchema = z.object({
  orderId: z.string(),
  binNumber: z.string().optional(),
  washerNumber: z.number().optional(),
  totalWeightLbs: z.number().optional(),
  numBags: z.number().optional(),
});

export async function startProcessingOrder(
  input: z.infer<typeof startProcessingSchema>
) {
  const session = await requireRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ATTENDANT
  );
  const tenant = await requireTenant();

  const parsed = startProcessingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { orderId, binNumber, washerNumber, totalWeightLbs, numBags } =
    parsed.data;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId: tenant.id,
      status: { in: ["picked_up", "confirmed"] },
    },
  });

  if (!order) {
    return { success: false, error: "Order not found or not in correct status" };
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: "processing",
        attendantId: session.user.id,
        binNumber: binNumber ?? order.binNumber,
        washerNumber: washerNumber ?? order.washerNumber,
        totalWeightLbs: totalWeightLbs ?? order.totalWeightLbs,
        numBags: numBags ?? order.numBags,
      },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: "processing",
        changedByUserId: session.user.id,
        notes: `Started processing${binNumber ? ` | Bin: ${binNumber}` : ""}${washerNumber ? ` | Washer: #${washerNumber}` : ""}`,
      },
    }),
  ]);

  return { success: true };
}

// =============================================================================
// Update Equipment Assignment
// =============================================================================

const updateEquipmentSchema = z.object({
  orderId: z.string(),
  washerNumber: z.number().optional(),
  dryerNumber: z.number().optional(),
  binNumber: z.string().optional(),
});

export async function updateEquipmentAssignment(
  input: z.infer<typeof updateEquipmentSchema>
) {
  const session = await requireRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ATTENDANT
  );
  const tenant = await requireTenant();

  const parsed = updateEquipmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { orderId, washerNumber, dryerNumber, binNumber } = parsed.data;

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId: tenant.id, status: "processing" },
  });

  if (!order) {
    return { success: false, error: "Order not found or not processing" };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      ...(washerNumber !== undefined && { washerNumber }),
      ...(dryerNumber !== undefined && { dryerNumber }),
      ...(binNumber !== undefined && { binNumber }),
    },
  });

  return { success: true };
}

// =============================================================================
// Mark Order Ready
// =============================================================================

export async function markOrderReady(orderId: string) {
  const session = await requireRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ATTENDANT
  );
  const tenant = await requireTenant();

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId: tenant.id, status: "processing" },
  });

  if (!order) {
    return { success: false, error: "Order not found or not processing" };
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: "ready",
        washerNumber: null,
        dryerNumber: null,
      },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: "ready",
        changedByUserId: session.user.id,
        notes: "Order ready for pickup/delivery",
      },
    }),
  ]);

  return { success: true };
}

// =============================================================================
// Get Attendant Order Detail (enriched for detail page)
// =============================================================================

export async function getAttendantOrderDetail(orderId: string) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER, UserRole.ATTENDANT);
  const tenant = await requireTenant();

  const [order, processingOrders, laundromats, services] = await Promise.all([
    prisma.order.findFirst({
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
    }),

    // All processing orders for equipment usage
    prisma.order.findMany({
      where: { tenantId: tenant.id, status: "processing" },
      select: { id: true, washerNumber: true, dryerNumber: true },
    }),

    prisma.laundromat.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { numWashers: true, numDryers: true },
    }),

    prisma.service.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        name: true,
        category: true,
        pricingType: true,
        price: true,
      },
    }),
  ]);

  if (!order) return null;

  // Build equipment usage (exclude current order)
  const washersInUse: number[] = [];
  const dryersInUse: number[] = [];
  for (const o of processingOrders) {
    if (o.id === orderId) continue;
    if (o.washerNumber) washersInUse.push(o.washerNumber);
    if (o.dryerNumber) dryersInUse.push(o.dryerNumber);
  }

  const location = laundromats[0] ?? { numWashers: 0, numDryers: 0 };

  return {
    order,
    equipment: {
      totalWashers: location.numWashers,
      totalDryers: location.numDryers,
      washersInUse,
      dryersInUse,
    },
    services,
  };
}

// =============================================================================
// Add Order Item
// =============================================================================

const addOrderItemSchema = z.object({
  orderId: z.string(),
  serviceId: z.string(),
  quantity: z.number().min(0.01),
});

export async function addOrderItem(input: z.infer<typeof addOrderItemSchema>) {
  const session = await requireRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ATTENDANT
  );
  const tenant = await requireTenant();

  const parsed = addOrderItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0].message };
  }

  const { orderId, serviceId, quantity } = parsed.data;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId: tenant.id,
      status: { in: ["confirmed", "picked_up", "processing"] },
    },
  });

  if (!order) {
    return { success: false as const, error: "Order not found or not editable" };
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId: tenant.id, isActive: true },
  });

  if (!service) {
    return { success: false as const, error: "Service not found" };
  }

  const totalPrice = service.price * quantity;

  await prisma.orderItem.create({
    data: {
      orderId,
      serviceId,
      itemType: "service",
      name: service.name,
      quantity,
      unitPrice: service.price,
      totalPrice,
    },
  });

  await recalculateOrderTotals(orderId, tenant.id);

  return { success: true as const };
}

// =============================================================================
// Remove Order Item
// =============================================================================

const removeOrderItemSchema = z.object({
  orderId: z.string(),
  itemId: z.string(),
});

export async function removeOrderItem(
  input: z.infer<typeof removeOrderItemSchema>
) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER, UserRole.ATTENDANT);
  const tenant = await requireTenant();

  const parsed = removeOrderItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0].message };
  }

  const { orderId, itemId } = parsed.data;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId: tenant.id,
      status: { in: ["confirmed", "picked_up", "processing"] },
    },
  });

  if (!order) {
    return { success: false as const, error: "Order not found or not editable" };
  }

  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, orderId },
  });

  if (!item) {
    return { success: false as const, error: "Item not found" };
  }

  await prisma.orderItem.delete({ where: { id: itemId } });

  await recalculateOrderTotals(orderId, tenant.id);

  return { success: true as const };
}

// =============================================================================
// Update Order Weight
// =============================================================================

const updateOrderWeightSchema = z.object({
  orderId: z.string(),
  totalWeightLbs: z.number().min(0),
});

export async function updateOrderWeight(
  input: z.infer<typeof updateOrderWeightSchema>
) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER, UserRole.ATTENDANT);
  const tenant = await requireTenant();

  const parsed = updateOrderWeightSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0].message };
  }

  const { orderId, totalWeightLbs } = parsed.data;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId: tenant.id,
      status: { in: ["confirmed", "picked_up", "processing"] },
    },
    include: { items: { include: { service: true } } },
  });

  if (!order) {
    return { success: false as const, error: "Order not found or not editable" };
  }

  // Update weight on order
  await prisma.order.update({
    where: { id: orderId },
    data: { totalWeightLbs },
  });

  // Recalculate per_pound items based on new weight
  for (const item of order.items) {
    if (item.service?.pricingType === "per_pound") {
      const newTotal = item.unitPrice * totalWeightLbs;
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { quantity: totalWeightLbs, totalPrice: newTotal },
      });
    }
  }

  await recalculateOrderTotals(orderId, tenant.id);

  return { success: true as const };
}

// =============================================================================
// Mark Order Ready & Charge Stored Card
// =============================================================================

export async function markOrderReadyAndCharge(orderId: string) {
  const session = await requireRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ATTENDANT
  );
  const tenant = await requireTenant();

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId: tenant.id, status: "processing" },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          stripeCustomerId: true,
          paymentMethods: {
            where: { isDefault: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!order) {
    return { success: false as const, error: "Order not found or not processing" };
  }

  // Attempt payment if not already paid AND has a customer
  if (!order.paidAt && order.customer) {
    const customer = order.customer;
    const defaultPm = customer.paymentMethods[0];

    if (customer.stripeCustomerId && defaultPm && tenant.stripeConnectAccountId) {
      try {
        const pi = await chargeStoredCard({
          amount: order.totalAmount,
          connectedAccountId: tenant.stripeConnectAccountId,
          platformFeePercent: tenant.platformFeePercent,
          stripeCustomerId: customer.stripeCustomerId,
          paymentMethodId: defaultPm.stripePaymentMethodId,
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            tenantId: tenant.id,
          },
        });

        await prisma.order.update({
          where: { id: orderId },
          data: {
            stripePaymentIntentId: pi.id,
            paymentMethod: "stored_card",
            paidAt: new Date(),
          },
        });
      } catch (error) {
        console.error("Failed to charge stored card:", error);
        return {
          success: false as const,
          error: "Payment failed. Please collect payment manually before marking ready.",
        };
      }
    }
    // If no stored card or no Stripe connect, skip payment silently (walk-in / cash)
  }

  // Update status to ready
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: "ready",
        washerNumber: null,
        dryerNumber: null,
      },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: "ready",
        changedByUserId: session.user.id,
        notes: "Order ready for pickup/delivery",
      },
    }),
  ]);

  // Send notification (fire-and-forget)
  if (order.customerId) {
    const customerName = [order.customer?.firstName, order.customer?.lastName]
      .filter(Boolean)
      .join(" ");

    sendNotification({
      tenantId: tenant.id,
      userId: order.customerId,
      event: "order_ready",
      variables: {
        orderNumber: order.orderNumber,
        customerName,
      },
    }).catch((err) => {
      console.error("Failed to send order_ready notification:", err);
    });
  }

  return { success: true as const };
}

// =============================================================================
// Recalculate Order Totals (private helper)
// =============================================================================

async function recalculateOrderTotals(orderId: string, tenantId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { items: true },
  });

  if (!order) return;

  const subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = subtotal * order.taxRate;
  const totalAmount =
    subtotal + taxAmount + order.deliveryFee + order.tipAmount - order.discountAmount;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      subtotal,
      taxAmount,
      totalAmount: Math.max(0, totalAmount),
    },
  });
}
