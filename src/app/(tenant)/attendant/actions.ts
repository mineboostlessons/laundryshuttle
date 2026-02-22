"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";

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
