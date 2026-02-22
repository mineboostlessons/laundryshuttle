"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUpsellsForCustomer, type UpsellRecommendation } from "@/lib/upsell";

// ---------------------------------------------------------------------------
// Dashboard Overview
// ---------------------------------------------------------------------------

export async function getCustomerDashboard() {
  const session = await requireRole(UserRole.CUSTOMER);
  const tenant = await requireTenant();

  const [recentOrders, addressCount, user, activeSubscription] =
    await Promise.all([
      prisma.order.findMany({
        where: { customerId: session.user.id, tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          items: true,
          laundromat: { select: { name: true } },
        },
      }),
      prisma.customerAddress.count({
        where: { userId: session.user.id },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          walletBalance: true,
          defaultPreferences: true,
          firstName: true,
          lastName: true,
        },
      }),
      prisma.customerSubscription.findFirst({
        where: { userId: session.user.id, status: "active" },
        include: { plan: true },
      }),
    ]);

  const totalOrders = await prisma.order.count({
    where: { customerId: session.user.id, tenantId: tenant.id },
  });

  const activeOrders = await prisma.order.count({
    where: {
      customerId: session.user.id,
      tenantId: tenant.id,
      status: { notIn: ["delivered", "completed", "cancelled"] },
    },
  });

  return {
    recentOrders,
    addressCount,
    walletBalance: user?.walletBalance ?? 0,
    totalOrders,
    activeOrders,
    activeSubscription,
    firstName: user?.firstName,
  };
}

// ---------------------------------------------------------------------------
// Upsell Recommendations
// ---------------------------------------------------------------------------

export async function getCustomerUpsells(): Promise<UpsellRecommendation[]> {
  try {
    const session = await requireRole(UserRole.CUSTOMER);
    const tenant = await requireTenant();
    return getUpsellsForCustomer(session.user.id, tenant.id);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

const ORDER_STATUSES = [
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

type OrderStatus = (typeof ORDER_STATUSES)[number];

export async function getCustomerOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  const session = await requireRole(UserRole.CUSTOMER);
  const tenant = await requireTenant();

  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    customerId: session.user.id,
    tenantId: tenant.id,
  };

  if (params.status && params.status !== "all") {
    if (params.status === "active") {
      where.status = {
        notIn: ["delivered", "completed", "cancelled"],
      };
    } else if (params.status === "completed") {
      where.status = { in: ["delivered", "completed"] };
    } else if (params.status === "cancelled") {
      where.status = "cancelled";
    }
  }

  if (params.search) {
    where.orderNumber = { contains: params.search, mode: "insensitive" };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        items: true,
        laundromat: { select: { name: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getOrderDetail(orderId: string) {
  const session = await requireRole(UserRole.CUSTOMER);
  const tenant = await requireTenant();

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      customerId: session.user.id,
      tenantId: tenant.id,
    },
    include: {
      items: {
        include: {
          service: { select: { name: true, category: true } },
          retailProduct: { select: { name: true } },
        },
      },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        include: { changedByUser: { select: { firstName: true, role: true } } },
      },
      laundromat: { select: { name: true, address: true, phone: true } },
      pickupAddress: true,
      driver: { select: { firstName: true, lastName: true, phone: true } },
      review: true,
      tips: true,
    },
  });

  return order;
}

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

const addressSchema = z.object({
  label: z.string().min(1, "Label is required").max(50),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(5, "Valid ZIP required"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  pickupNotes: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function getCustomerAddresses() {
  const session = await requireRole(UserRole.CUSTOMER);
  return prisma.customerAddress.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function createAddress(data: z.infer<typeof addressSchema>) {
  const session = await requireRole(UserRole.CUSTOMER);
  const parsed = addressSchema.parse(data);

  if (parsed.isDefault) {
    await prisma.customerAddress.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    });
  }

  const address = await prisma.customerAddress.create({
    data: {
      userId: session.user.id,
      label: parsed.label,
      addressLine1: parsed.addressLine1,
      addressLine2: parsed.addressLine2 ?? null,
      city: parsed.city,
      state: parsed.state,
      zip: parsed.zip,
      lat: parsed.lat ?? null,
      lng: parsed.lng ?? null,
      pickupNotes: parsed.pickupNotes ?? null,
      isDefault: parsed.isDefault ?? false,
    },
  });

  revalidatePath("/customer/addresses");
  return { success: true, address };
}

export async function updateAddress(
  addressId: string,
  data: z.infer<typeof addressSchema>
) {
  const session = await requireRole(UserRole.CUSTOMER);
  const parsed = addressSchema.parse(data);

  // Verify ownership
  const existing = await prisma.customerAddress.findFirst({
    where: { id: addressId, userId: session.user.id },
  });
  if (!existing) throw new Error("Address not found");

  if (parsed.isDefault) {
    await prisma.customerAddress.updateMany({
      where: { userId: session.user.id, id: { not: addressId } },
      data: { isDefault: false },
    });
  }

  const address = await prisma.customerAddress.update({
    where: { id: addressId },
    data: {
      label: parsed.label,
      addressLine1: parsed.addressLine1,
      addressLine2: parsed.addressLine2 ?? null,
      city: parsed.city,
      state: parsed.state,
      zip: parsed.zip,
      lat: parsed.lat ?? null,
      lng: parsed.lng ?? null,
      pickupNotes: parsed.pickupNotes ?? null,
      isDefault: parsed.isDefault ?? false,
    },
  });

  revalidatePath("/customer/addresses");
  return { success: true, address };
}

export async function deleteAddress(addressId: string) {
  const session = await requireRole(UserRole.CUSTOMER);

  const existing = await prisma.customerAddress.findFirst({
    where: { id: addressId, userId: session.user.id },
  });
  if (!existing) throw new Error("Address not found");

  await prisma.customerAddress.delete({ where: { id: addressId } });
  revalidatePath("/customer/addresses");
  return { success: true };
}

export async function setDefaultAddress(addressId: string) {
  const session = await requireRole(UserRole.CUSTOMER);

  const existing = await prisma.customerAddress.findFirst({
    where: { id: addressId, userId: session.user.id },
  });
  if (!existing) throw new Error("Address not found");

  await prisma.customerAddress.updateMany({
    where: { userId: session.user.id },
    data: { isDefault: false },
  });

  await prisma.customerAddress.update({
    where: { id: addressId },
    data: { isDefault: true },
  });

  revalidatePath("/customer/addresses");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Profile & Preferences
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  notificationPreference: z.enum(["email", "sms", "both", "push"]),
});

const preferencesSchema = z.object({
  detergent: z.string().optional(),
  waterTemp: z.string().optional(),
  fabricSoftener: z.boolean().optional(),
  dryerTemp: z.string().optional(),
  specialInstructions: z.string().optional(),
});

export async function getCustomerProfile() {
  const session = await requireRole(UserRole.CUSTOMER);
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      notificationPreference: true,
      defaultPreferences: true,
      walletBalance: true,
      createdAt: true,
    },
  });
}

export async function updateProfile(data: z.infer<typeof profileSchema>) {
  const session = await requireRole(UserRole.CUSTOMER);
  const parsed = profileSchema.parse(data);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      phone: parsed.phone ?? null,
      notificationPreference: parsed.notificationPreference,
    },
  });

  revalidatePath("/customer/profile");
  return { success: true };
}

export async function updatePreferences(
  data: z.infer<typeof preferencesSchema>
) {
  const session = await requireRole(UserRole.CUSTOMER);
  const parsed = preferencesSchema.parse(data);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { defaultPreferences: parsed },
  });

  revalidatePath("/customer/profile");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

const reviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional(),
});

export async function submitReview(data: z.infer<typeof reviewSchema>) {
  const session = await requireRole(UserRole.CUSTOMER);
  const tenant = await requireTenant();
  const parsed = reviewSchema.parse(data);

  // Verify the order belongs to this customer and is deliverable
  const order = await prisma.order.findFirst({
    where: {
      id: parsed.orderId,
      customerId: session.user.id,
      tenantId: tenant.id,
      status: { in: ["delivered", "completed"] },
    },
    include: { review: true },
  });

  if (!order) throw new Error("Order not found or not eligible for review");
  if (order.review) throw new Error("Review already submitted for this order");

  const shouldRouteToGoogle = parsed.rating >= 4;
  const shouldAlertManager = parsed.rating <= 3;

  const [review] = await prisma.$transaction([
    prisma.review.create({
      data: {
        orderId: parsed.orderId,
        userId: session.user.id,
        rating: parsed.rating,
        text: parsed.text ?? null,
        isPublic: true,
        routedToGoogle: shouldRouteToGoogle,
        managerAlerted: shouldAlertManager,
      },
    }),
    prisma.order.update({
      where: { id: parsed.orderId },
      data: {
        rating: parsed.rating,
        reviewText: parsed.text ?? null,
        reviewedAt: new Date(),
      },
    }),
  ]);

  // Alert managers for low ratings (1-3 stars)
  if (shouldAlertManager) {
    const managers = await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        role: { in: ["owner", "manager"] },
        isActive: true,
      },
      select: { id: true, email: true },
    });

    // Fire-and-forget notifications to managers
    const { sendNotification } = await import("@/lib/notifications");
    for (const manager of managers) {
      sendNotification({
        tenantId: tenant.id,
        userId: manager.id,
        event: "order_completed",
        channels: ["email"],
        recipientEmail: manager.email,
        variables: {
          customerName: session.user.name ?? "A customer",
          orderNumber: order.orderNumber,
          total: `Rating: ${parsed.rating}/5 — ${parsed.text ?? "No comment"}`,
        },
      }).catch(console.error);
    }
  }

  revalidatePath(`/customer/orders/${parsed.orderId}`);
  return { success: true, review, routeToGoogle: shouldRouteToGoogle };
}

// ---------------------------------------------------------------------------
// Tipping
// ---------------------------------------------------------------------------

const tipSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().min(0.5).max(500),
});

export async function submitTip(data: z.infer<typeof tipSchema>) {
  const session = await requireRole(UserRole.CUSTOMER);
  const tenant = await requireTenant();
  const parsed = tipSchema.parse(data);

  // Verify the order belongs to this customer
  const order = await prisma.order.findFirst({
    where: {
      id: parsed.orderId,
      customerId: session.user.id,
      tenantId: tenant.id,
      status: { in: ["delivered", "completed", "out_for_delivery"] },
    },
    select: {
      id: true,
      driverId: true,
      orderNumber: true,
      stripePaymentIntentId: true,
      tenantId: true,
      tenant: {
        select: {
          stripeConnectAccountId: true,
          platformFeePercent: true,
        },
      },
    },
  });

  if (!order) throw new Error("Order not found or not eligible for tipping");

  // Check if tip already exists for this order from this user
  const existingTip = await prisma.tip.findFirst({
    where: { orderId: parsed.orderId, userId: session.user.id },
  });

  if (existingTip) throw new Error("Tip already submitted for this order");

  let stripeTransferId: string | null = null;

  // Process tip payment via Stripe if connected account exists
  if (order.tenant.stripeConnectAccountId) {
    try {
      const { stripe } = await import("@/lib/stripe");
      const amountInCents = Math.round(parsed.amount * 100);

      // Create a payment intent for the tip (no platform fee on tips)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        transfer_data: {
          destination: order.tenant.stripeConnectAccountId,
        },
        metadata: {
          type: "tip",
          orderId: order.id,
          driverId: order.driverId ?? "",
        },
      });

      stripeTransferId = paymentIntent.id;
    } catch (error) {
      console.error("Stripe tip payment error:", error);
      // Still save the tip record even if Stripe fails
    }
  }

  const [tip] = await prisma.$transaction([
    prisma.tip.create({
      data: {
        orderId: parsed.orderId,
        userId: session.user.id,
        driverId: order.driverId,
        amount: parsed.amount,
        stripeTransferId,
      },
    }),
    prisma.order.update({
      where: { id: parsed.orderId },
      data: {
        tipAmount: { increment: parsed.amount },
        totalAmount: { increment: parsed.amount },
      },
    }),
  ]);

  revalidatePath(`/customer/orders/${parsed.orderId}`);
  return { success: true, tip };
}
