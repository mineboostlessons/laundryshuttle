"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { generateOrderNumber } from "@/lib/utils";
import { notifyPaymentReceived } from "@/lib/notifications";

// =============================================================================
// POS Data Loading
// =============================================================================

export async function getPosData() {
  const session = await requireRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ATTENDANT
  );
  const tenant = await requireTenant();

  const [services, retailProducts, laundromats, activeShift, todayStats] =
    await Promise.all([
      prisma.service.findMany({
        where: { tenantId: tenant.id, isActive: true },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
        select: {
          id: true,
          name: true,
          category: true,
          pricingType: true,
          price: true,
          icon: true,
          taxable: true,
        },
      }),

      prisma.retailProduct.findMany({
        where: { tenantId: tenant.id, inStock: true },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          sku: true,
          imageUrl: true,
          taxable: true,
          stockQuantity: true,
        },
      }),

      prisma.laundromat.findMany({
        where: { tenantId: tenant.id, isActive: true },
        select: { id: true, name: true },
      }),

      prisma.posShift.findFirst({
        where: {
          attendantId: session.user.id,
          closedAt: null,
        },
        orderBy: { openedAt: "desc" },
      }),

      getPosStatsForToday(tenant.id),
    ]);

  // Get tenant tax config
  const tenantFull = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      defaultTaxRate: true,
      taxMode: true,
      stripeConnectAccountId: true,
      stripeConnectStatus: true,
    },
  });

  return {
    services,
    retailProducts,
    laundromats,
    activeShift,
    todayStats,
    taxRate: tenantFull?.defaultTaxRate ?? 0,
    stripeConnected:
      !!tenantFull?.stripeConnectAccountId &&
      tenantFull?.stripeConnectStatus === "active",
  };
}

async function getPosStatsForToday(tenantId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayOrders = await prisma.order.findMany({
    where: {
      tenantId,
      orderType: { in: ["pos", "walk_in"] },
      createdAt: { gte: todayStart },
    },
    select: {
      totalAmount: true,
      paymentMethod: true,
      status: true,
    },
  });

  const completed = todayOrders.filter(
    (o) => o.status !== "cancelled" && o.status !== "refunded"
  );

  return {
    totalOrders: completed.length,
    totalRevenue: completed.reduce((sum, o) => sum + o.totalAmount, 0),
    cashSales: completed
      .filter((o) => o.paymentMethod === "cash")
      .reduce((sum, o) => sum + o.totalAmount, 0),
    cardSales: completed
      .filter((o) => o.paymentMethod === "card")
      .reduce((sum, o) => sum + o.totalAmount, 0),
  };
}

// =============================================================================
// Create POS Order
// =============================================================================

const cartItemSchema = z.object({
  type: z.enum(["service", "retail_product"]),
  id: z.string(),
  name: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  taxable: z.boolean(),
});

const createPosOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  paymentMethod: z.enum(["card", "cash", "split"]),
  cashAmount: z.number().min(0).optional(),
  cardAmount: z.number().min(0).optional(),
  stripePaymentIntentId: z.string().optional(),
  laundromatId: z.string(),
  customerName: z.string().optional(),
  notes: z.string().optional(),
});

export async function createPosOrder(
  input: z.infer<typeof createPosOrderSchema>
) {
  const session = await requireRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ATTENDANT
  );
  const tenant = await requireTenant();

  const parsed = createPosOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  // Get tenant tax rate
  const tenantFull = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: { defaultTaxRate: true },
  });
  const taxRate = tenantFull?.defaultTaxRate ?? 0;

  // Calculate totals
  let subtotal = 0;
  let taxableAmount = 0;
  for (const item of data.items) {
    const lineTotal = item.unitPrice * item.quantity;
    subtotal += lineTotal;
    if (item.taxable) {
      taxableAmount += lineTotal;
    }
  }
  const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  // Generate order number
  const orderCount = await prisma.order.count({
    where: { tenantId: tenant.id },
  });
  const orderNumber = generateOrderNumber("POS", orderCount + 1);

  // Create order + items in a transaction
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        tenantId: tenant.id,
        laundromatId: data.laundromatId,
        attendantId: session.user.id,
        orderType: "pos",
        status: "completed",
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        paymentMethod: data.paymentMethod,
        stripePaymentIntentId: data.stripePaymentIntentId,
        paidAt: new Date(),
        specialInstructions: data.notes,
        items: {
          create: data.items.map((item) => ({
            itemType: item.type === "service" ? "service" : "retail_product",
            serviceId: item.type === "service" ? item.id : null,
            retailProductId: item.type === "retail_product" ? item.id : null,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
          })),
        },
      },
    });

    // Create status history entry
    await tx.orderStatusHistory.create({
      data: {
        orderId: newOrder.id,
        status: "completed",
        changedByUserId: session.user.id,
        notes: `POS order | ${data.paymentMethod} payment`,
      },
    });

    // Decrement stock for retail products
    for (const item of data.items) {
      if (item.type === "retail_product") {
        await tx.retailProduct.updateMany({
          where: {
            id: item.id,
            tenantId: tenant.id,
            stockQuantity: { not: null },
          },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });
      }
    }

    // Update shift stats if there's an active shift
    const activeShift = await tx.posShift.findFirst({
      where: { attendantId: session.user.id, closedAt: null },
      orderBy: { openedAt: "desc" },
    });

    if (activeShift) {
      const updateData: Record<string, unknown> = {
        totalOrders: { increment: 1 },
      };
      if (data.paymentMethod === "cash") {
        updateData.cashSales = { increment: totalAmount };
      } else if (data.paymentMethod === "card") {
        updateData.cardSales = { increment: totalAmount };
      } else if (data.paymentMethod === "split") {
        updateData.cashSales = { increment: data.cashAmount ?? 0 };
        updateData.cardSales = { increment: data.cardAmount ?? 0 };
      }
      await tx.posShift.update({
        where: { id: activeShift.id },
        data: updateData,
      });
    }

    return newOrder;
  });

  // Send payment notification if the order has a customer (fire-and-forget)
  if (order.customerId) {
    notifyPaymentReceived({
      tenantId: tenant.id,
      userId: order.customerId,
      orderNumber: order.orderNumber,
      total: order.totalAmount,
    }).catch((err) => console.error("POS notification error:", err));
  }

  return {
    success: true as const,
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
    },
  };
}

// =============================================================================
// POS Shift Management
// =============================================================================

const openShiftSchema = z.object({
  laundromatId: z.string(),
  openingBalance: z.number().min(0),
});

export async function openShift(input: z.infer<typeof openShiftSchema>) {
  const session = await requireRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ATTENDANT
  );
  await requireTenant();

  const parsed = openShiftSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0].message };
  }

  // Check for existing open shift
  const existingShift = await prisma.posShift.findFirst({
    where: { attendantId: session.user.id, closedAt: null },
  });

  if (existingShift) {
    return { success: false as const, error: "You already have an open shift" };
  }

  const shift = await prisma.posShift.create({
    data: {
      laundromatId: parsed.data.laundromatId,
      attendantId: session.user.id,
      openingBalance: parsed.data.openingBalance,
    },
  });

  return { success: true as const, data: shift };
}

const closeShiftSchema = z.object({
  shiftId: z.string(),
  closingBalance: z.number().min(0),
  notes: z.string().optional(),
});

export async function closeShift(input: z.infer<typeof closeShiftSchema>) {
  const session = await requireRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ATTENDANT
  );
  await requireTenant();

  const parsed = closeShiftSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0].message };
  }

  const shift = await prisma.posShift.findFirst({
    where: {
      id: parsed.data.shiftId,
      attendantId: session.user.id,
      closedAt: null,
    },
  });

  if (!shift) {
    return { success: false as const, error: "Shift not found or already closed" };
  }

  const updatedShift = await prisma.posShift.update({
    where: { id: shift.id },
    data: {
      closedAt: new Date(),
      closingBalance: parsed.data.closingBalance,
      notes: parsed.data.notes,
    },
  });

  return { success: true as const, data: updatedShift };
}

export async function getCurrentShift() {
  const session = await requireRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ATTENDANT
  );

  const shift = await prisma.posShift.findFirst({
    where: { attendantId: session.user.id, closedAt: null },
    orderBy: { openedAt: "desc" },
  });

  return shift;
}

export async function getShiftHistory() {
  const session = await requireRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ATTENDANT
  );
  const tenant = await requireTenant();

  // Owners/managers see all shifts; attendants see only theirs
  const where =
    session.user.role === UserRole.ATTENDANT
      ? { attendantId: session.user.id }
      : {};

  const shifts = await prisma.posShift.findMany({
    where: {
      ...where,
      laundromatId: {
        in: (
          await prisma.laundromat.findMany({
            where: { tenantId: tenant.id },
            select: { id: true },
          })
        ).map((l) => l.id),
      },
    },
    orderBy: { openedAt: "desc" },
    take: 50,
  });

  return shifts;
}

// =============================================================================
// Retail Product Management
// =============================================================================

const retailProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  sku: z.string().max(50).optional(),
  price: z.number().positive(),
  costPrice: z.number().min(0).optional(),
  category: z.string().max(100).optional(),
  taxable: z.boolean().default(true),
  stockQuantity: z.number().int().min(0).optional(),
  sortOrder: z.number().int().default(0),
});

export async function createRetailProduct(
  input: z.infer<typeof retailProductSchema>
) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const parsed = retailProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0].message };
  }

  const product = await prisma.retailProduct.create({
    data: {
      tenantId: tenant.id,
      ...parsed.data,
      inStock: true,
    },
  });

  return { success: true as const, data: product };
}

const updateRetailProductSchema = retailProductSchema.partial().extend({
  id: z.string(),
  inStock: z.boolean().optional(),
});

export async function updateRetailProduct(
  input: z.infer<typeof updateRetailProductSchema>
) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const parsed = updateRetailProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0].message };
  }

  const { id, ...data } = parsed.data;

  const product = await prisma.retailProduct.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!product) {
    return { success: false as const, error: "Product not found" };
  }

  const updated = await prisma.retailProduct.update({
    where: { id },
    data,
  });

  return { success: true as const, data: updated };
}

export async function deleteRetailProduct(id: string) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const product = await prisma.retailProduct.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!product) {
    return { success: false as const, error: "Product not found" };
  }

  // Soft delete — mark as out of stock
  await prisma.retailProduct.update({
    where: { id },
    data: { inStock: false },
  });

  return { success: true as const };
}

export async function getAllRetailProducts() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  return prisma.retailProduct.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}
