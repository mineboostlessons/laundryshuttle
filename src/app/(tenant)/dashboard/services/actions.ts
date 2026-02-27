"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";

// =============================================================================
// Schemas
// =============================================================================

const createServiceSchema = z.object({
  category: z.enum(["wash_and_fold", "dry_cleaning", "specialty"]),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  pricingType: z.enum(["per_pound", "per_bag", "per_item", "flat_rate"]),
  price: z.number().min(0),
  icon: z.string().max(50).optional(),
  taxable: z.boolean().optional(),
});

const updateServiceSchema = z.object({
  id: z.string(),
  category: z.enum(["wash_and_fold", "dry_cleaning", "specialty"]).optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  pricingType: z.enum(["per_pound", "per_bag", "per_item", "flat_rate"]).optional(),
  price: z.number().min(0).optional(),
  icon: z.string().max(50).optional().nullable(),
  isActive: z.boolean().optional(),
  taxable: z.boolean().optional(),
});

// =============================================================================
// List Services
// =============================================================================

export async function listServices() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  return prisma.service.findMany({
    where: { tenantId: tenant.id },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      category: true,
      name: true,
      description: true,
      pricingType: true,
      price: true,
      icon: true,
      isActive: true,
      sortOrder: true,
      taxable: true,
      createdAt: true,
    },
  });
}

// =============================================================================
// Create Service
// =============================================================================

export async function createService(input: z.infer<typeof createServiceSchema>) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const parsed = createServiceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  // Auto-increment sortOrder
  const maxSort = await prisma.service.aggregate({
    where: { tenantId: tenant.id },
    _max: { sortOrder: true },
  });
  const nextSort = (maxSort._max.sortOrder ?? 0) + 1;

  const service = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      category: data.category,
      name: data.name,
      description: data.description,
      pricingType: data.pricingType,
      price: data.price,
      icon: data.icon,
      taxable: data.taxable ?? true,
      sortOrder: nextSort,
    },
  });

  return { success: true, serviceId: service.id };
}

// =============================================================================
// Update Service
// =============================================================================

export async function updateService(input: z.infer<typeof updateServiceSchema>) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const parsed = updateServiceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { id, ...data } = parsed.data;

  const service = await prisma.service.findFirst({
    where: { id, tenantId: tenant.id },
  });

  if (!service) {
    return { success: false, error: "Service not found" };
  }

  await prisma.service.update({
    where: { id },
    data,
  });

  return { success: true };
}

// =============================================================================
// Delete Service (soft-delete via isActive: false)
// =============================================================================

export async function deleteService(serviceId: string) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId: tenant.id },
  });

  if (!service) {
    return { success: false, error: "Service not found" };
  }

  await prisma.service.update({
    where: { id: serviceId },
    data: { isActive: false },
  });

  return { success: true };
}
