"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const enableSandboxSchema = z.object({
  durationDays: z.number().min(1).max(90).default(14),
});

export async function getSandboxStatus() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const fullTenant = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      isSandbox: true,
      sandboxExpiresAt: true,
      _count: {
        select: {
          orders: { where: { specialInstructions: { contains: "[SANDBOX]" } } },
          users: { where: { email: { contains: "sandbox-" } } },
        },
      },
    },
  });

  return {
    isSandbox: fullTenant?.isSandbox ?? false,
    sandboxExpiresAt: fullTenant?.sandboxExpiresAt?.toISOString() ?? null,
    sandboxOrders: fullTenant?._count.orders ?? 0,
    sandboxUsers: fullTenant?._count.users ?? 0,
  };
}

export async function enableSandbox(
  _prev: { success: boolean; error?: string },
  formData: FormData
) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const durationDays = Number(formData.get("durationDays") ?? 14);
  const parsed = enableSandboxSchema.safeParse({ durationDays });
  if (!parsed.success) {
    return { success: false, error: "Invalid duration" };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + parsed.data.durationDays);

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { isSandbox: true, sandboxExpiresAt: expiresAt },
  });

  // Seed sample sandbox data
  await seedSandboxData(tenant.id);

  revalidatePath("/dashboard/sandbox");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function disableSandbox() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  // Remove sandbox flag
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { isSandbox: false, sandboxExpiresAt: null },
  });

  // Clean up sandbox data
  await cleanupSandboxData(tenant.id);

  revalidatePath("/dashboard/sandbox");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function resetSandboxData() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const fullTenant = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: { isSandbox: true },
  });

  if (!fullTenant?.isSandbox) {
    return { success: false, error: "Sandbox mode is not enabled" };
  }

  await cleanupSandboxData(tenant.id);
  await seedSandboxData(tenant.id);

  revalidatePath("/dashboard/sandbox");
  revalidatePath("/dashboard");
  return { success: true };
}

async function seedSandboxData(tenantId: string) {
  // Get first laundromat for the tenant
  const laundromat = await prisma.laundromat.findFirst({
    where: { tenantId },
  });
  if (!laundromat) return;

  // Get services for the tenant
  const services = await prisma.service.findMany({
    where: { tenantId, isActive: true },
    take: 3,
  });

  // Create sandbox customer accounts
  const sandboxCustomers = [];
  const customerNames = [
    { first: "Sarah", last: "Johnson", email: "sandbox-sarah@example.com" },
    { first: "Mike", last: "Chen", email: "sandbox-mike@example.com" },
    { first: "Emily", last: "Rodriguez", email: "sandbox-emily@example.com" },
    { first: "James", last: "Williams", email: "sandbox-james@example.com" },
    { first: "Lisa", last: "Anderson", email: "sandbox-lisa@example.com" },
  ];

  for (const c of customerNames) {
    const customer = await prisma.user.create({
      data: {
        tenantId,
        email: c.email,
        firstName: c.first,
        lastName: c.last,
        role: "customer",
        isActive: true,
        passwordHash: "sandbox-no-login",
      },
    });
    sandboxCustomers.push(customer);
  }

  // Create sandbox orders with various statuses
  const statuses = [
    "pending",
    "confirmed",
    "picked_up",
    "processing",
    "ready",
    "out_for_delivery",
    "delivered",
    "delivered",
    "delivered",
    "delivered",
  ];

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 14);

  for (let i = 0; i < 10; i++) {
    const orderDate = new Date(baseDate);
    orderDate.setDate(orderDate.getDate() + i);
    const customer =
      sandboxCustomers[i % sandboxCustomers.length];
    const status = statuses[i];
    const subtotal = Math.round((15 + Math.random() * 45) * 100) / 100;
    const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
    const deliveryFee = 5.99;
    const total =
      Math.round((subtotal + taxAmount + deliveryFee) * 100) / 100;

    const order = await prisma.order.create({
      data: {
        orderNumber: `SBX-${Date.now()}-${String(i).padStart(3, "0")}`,
        tenantId,
        laundromatId: laundromat.id,
        customerId: customer.id,
        orderType: i % 3 === 0 ? "walk_in" : "delivery",
        status,
        subtotal,
        taxRate: 0.08,
        taxAmount,
        deliveryFee: i % 3 === 0 ? 0 : deliveryFee,
        totalAmount: i % 3 === 0 ? subtotal + taxAmount : total,
        numBags: Math.floor(Math.random() * 3) + 1,
        totalWeightLbs: Math.round((5 + Math.random() * 20) * 10) / 10,
        specialInstructions: "[SANDBOX] Sample order data",
        createdAt: orderDate,
        paidAt: status === "delivered" ? orderDate : null,
        paymentMethod: i % 4 === 0 ? "cash" : "card",
      },
    });

    // Add order items
    if (services.length > 0) {
      const service = services[i % services.length];
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          serviceId: service.id,
          itemType: "service",
          name: service.name,
          quantity: Math.floor(Math.random() * 3) + 1,
          unitPrice: service.price,
          totalPrice: subtotal,
        },
      });
    }
  }
}

async function cleanupSandboxData(tenantId: string) {
  // Delete sandbox orders (identified by specialInstructions marker)
  const sandboxOrders = await prisma.order.findMany({
    where: {
      tenantId,
      specialInstructions: { contains: "[SANDBOX]" },
    },
    select: { id: true },
  });

  if (sandboxOrders.length > 0) {
    const orderIds = sandboxOrders.map((o) => o.id);

    // Delete related records first
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.orderMessage.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: orderIds } },
    });
  }

  // Delete sandbox user accounts
  await prisma.user.deleteMany({
    where: {
      tenantId,
      email: { contains: "sandbox-" },
    },
  });
}
