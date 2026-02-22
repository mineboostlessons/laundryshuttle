"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";

export async function toggleDemoFlag(tenantId: string) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { isDemo: true },
  });

  if (!tenant) return { success: false, error: "Tenant not found" };

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { isDemo: !tenant.isDemo },
  });

  revalidatePath("/admin/demo");
  return { success: true };
}

export async function resetDemoTenant(tenantId: string) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      laundromats: { take: 1 },
      services: { where: { isActive: true }, take: 3 },
    },
  });

  if (!tenant) return { success: false, error: "Tenant not found" };

  // Clean up non-seed orders (keep orders that were part of original seed)
  const sandboxOrders = await prisma.order.findMany({
    where: {
      tenantId,
      specialInstructions: { contains: "[SANDBOX]" },
    },
    select: { id: true },
  });

  if (sandboxOrders.length > 0) {
    const orderIds = sandboxOrders.map((o) => o.id);
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: orderIds } },
    });
  }

  // Delete sandbox users
  await prisma.user.deleteMany({
    where: {
      tenantId,
      email: { contains: "sandbox-" },
    },
  });

  // Clear expired demo sessions
  await prisma.demoSession.deleteMany({
    where: {
      tenantId,
      expiresAt: { lt: new Date() },
    },
  });

  revalidatePath("/admin/demo");
  return { success: true };
}

export async function updateDemoResetInterval(
  tenantId: string,
  intervalHours: number | null
) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { demoResetInterval: intervalHours },
  });

  revalidatePath("/admin/demo");
  return { success: true };
}
