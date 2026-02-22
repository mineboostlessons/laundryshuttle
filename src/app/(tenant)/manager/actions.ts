"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { z } from "zod";

// =============================================================================
// Manager Dashboard Stats
// =============================================================================

export async function getManagerDashboardStats() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [
    todayPickups,
    todayDeliveries,
    pendingOrders,
    processingOrders,
    readyOrders,
    activeDrivers,
    activeAttendants,
    todayCompletedOrders,
    todayRevenue,
    openIssues,
  ] = await Promise.all([
    // Today's pickups
    prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        pickupDate: { gte: todayStart, lt: tomorrowStart },
        orderType: "delivery",
        status: { in: ["confirmed", "pending"] },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        pickupTimeSlot: true,
        pickupDate: true,
        customer: {
          select: { firstName: true, lastName: true, phone: true },
        },
        pickupAddress: {
          select: { addressLine1: true, city: true },
        },
      },
      orderBy: { pickupDate: "asc" },
    }),

    // Today's deliveries
    prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        deliveryDate: { gte: todayStart, lt: tomorrowStart },
        orderType: "delivery",
        status: { in: ["ready", "out_for_delivery"] },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryTimeSlot: true,
        deliveryDate: true,
        customer: {
          select: { firstName: true, lastName: true, phone: true },
        },
        pickupAddress: {
          select: { addressLine1: true, city: true },
        },
      },
      orderBy: { deliveryDate: "asc" },
    }),

    // Orders by active status
    prisma.order.findMany({
      where: { tenantId: tenant.id, status: "pending" },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderType: true,
        totalAmount: true,
        createdAt: true,
        customer: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    }),

    prisma.order.findMany({
      where: { tenantId: tenant.id, status: "processing" },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderType: true,
        totalAmount: true,
        createdAt: true,
        attendant: {
          select: { firstName: true, lastName: true },
        },
        customer: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    }),

    prisma.order.findMany({
      where: { tenantId: tenant.id, status: "ready" },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderType: true,
        totalAmount: true,
        createdAt: true,
        customer: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    }),

    // Active drivers
    prisma.user.count({
      where: {
        tenantId: tenant.id,
        role: "driver",
        isActive: true,
      },
    }),

    // Active attendants
    prisma.user.count({
      where: {
        tenantId: tenant.id,
        role: "attendant",
        isActive: true,
      },
    }),

    // Today's completed orders
    prisma.order.count({
      where: {
        tenantId: tenant.id,
        status: { in: ["completed", "delivered"] },
        updatedAt: { gte: todayStart },
      },
    }),

    // Today's revenue
    prisma.order.aggregate({
      where: {
        tenantId: tenant.id,
        paidAt: { not: null },
        createdAt: { gte: todayStart },
        status: { notIn: ["refunded", "cancelled"] },
      },
      _sum: { totalAmount: true },
    }),

    // Open issue reports
    prisma.issueReport.count({
      where: {
        order: { tenantId: tenant.id },
        status: { in: ["open", "investigating"] },
      },
    }),
  ]);

  return {
    todayPickups,
    todayDeliveries,
    pendingOrders,
    processingOrders,
    readyOrders,
    activeDrivers,
    activeAttendants,
    todayCompletedOrders,
    todayRevenue: todayRevenue._sum.totalAmount ?? 0,
    openIssues,
  };
}

// =============================================================================
// Update Order Status
// =============================================================================

const updateStatusSchema = z.object({
  orderId: z.string(),
  status: z.enum([
    "confirmed",
    "picked_up",
    "processing",
    "ready",
    "out_for_delivery",
    "delivered",
    "completed",
    "cancelled",
  ]),
  notes: z.string().optional(),
});

export async function updateOrderStatus(
  input: z.infer<typeof updateStatusSchema>
) {
  const session = await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { orderId, status, notes } = parsed.data;

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId: tenant.id },
    select: { id: true, status: true },
  });

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status },
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

  return { success: true };
}

// =============================================================================
// Assign Driver to Order
// =============================================================================

const assignDriverSchema = z.object({
  orderId: z.string(),
  driverId: z.string(),
});

export async function assignDriverToOrder(
  input: z.infer<typeof assignDriverSchema>
) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const parsed = assignDriverSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { orderId, driverId } = parsed.data;

  // Verify order and driver belong to tenant
  const [order, driver] = await Promise.all([
    prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
    }),
    prisma.user.findFirst({
      where: { id: driverId, tenantId: tenant.id, role: "driver" },
    }),
  ]);

  if (!order) return { success: false, error: "Order not found" };
  if (!driver) return { success: false, error: "Driver not found" };

  await prisma.order.update({
    where: { id: orderId },
    data: { driverId },
  });

  return { success: true };
}

// =============================================================================
// Get Available Drivers
// =============================================================================

export async function getAvailableDrivers() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  return prisma.user.findMany({
    where: {
      tenantId: tenant.id,
      role: "driver",
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
    orderBy: { firstName: "asc" },
  });
}

// =============================================================================
// Search Customers
// =============================================================================

export async function searchCustomers(query: string) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  if (!query || query.length < 2) return [];

  return prisma.user.findMany({
    where: {
      tenantId: tenant.id,
      role: "customer",
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      _count: { select: { ordersAsCustomer: true } },
    },
    take: 10,
    orderBy: { firstName: "asc" },
  });
}
