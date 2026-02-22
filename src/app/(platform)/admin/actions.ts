"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";

// --- Tenant Actions ---

const updateTenantSchema = z.object({
  id: z.string(),
  businessName: z.string().min(2).optional(),
  businessType: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  customDomain: z.string().optional(),
  subscriptionPlan: z.string().optional(),
  subscriptionStatus: z.string().optional(),
  platformFeePercent: z.coerce.number().min(0).max(1).optional(),
  themePreset: z.string().optional(),
  isActive: z.string().optional(), // "true" or "false" from form
});

export type AdminActionState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function toggleTenantStatus(
  tenantId: string,
  isActive: boolean
): Promise<AdminActionState> {
  await requireRole(UserRole.PLATFORM_ADMIN);

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive },
    });
    revalidatePath("/admin/tenants");
    revalidatePath(`/admin/tenants/${tenantId}`);
    return {
      success: true,
      message: isActive ? "Tenant activated" : "Tenant deactivated",
    };
  } catch {
    return { error: "Failed to update tenant status" };
  }
}

export async function updateTenant(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateTenantSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { id, isActive, customDomain, ...updateData } = parsed.data;

  try {
    await prisma.tenant.update({
      where: { id },
      data: {
        ...updateData,
        phone: updateData.phone || null,
        email: updateData.email || null,
        customDomain: customDomain || null,
        isActive: isActive === "true",
      },
    });

    revalidatePath("/admin/tenants");
    revalidatePath(`/admin/tenants/${id}`);
    return { success: true, message: "Tenant updated successfully" };
  } catch {
    return { error: "Failed to update tenant" };
  }
}

export async function deleteTenant(tenantId: string): Promise<AdminActionState> {
  await requireRole(UserRole.PLATFORM_ADMIN);

  try {
    await prisma.tenant.delete({ where: { id: tenantId } });
    revalidatePath("/admin/tenants");
    return { success: true, message: "Tenant deleted" };
  } catch {
    return { error: "Failed to delete tenant" };
  }
}

// --- Stats ---

export async function getPlatformStats() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const [
    totalTenants,
    activeTenants,
    totalUsers,
    totalOrders,
    totalCustomers,
    recentTenants,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.order.count(),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.tenant.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        businessName: true,
        isActive: true,
        subscriptionStatus: true,
        createdAt: true,
        _count: { select: { users: true, orders: true } },
      },
    }),
  ]);

  return {
    totalTenants,
    activeTenants,
    inactiveTenants: totalTenants - activeTenants,
    totalUsers,
    totalOrders,
    totalCustomers,
    recentTenants,
  };
}
