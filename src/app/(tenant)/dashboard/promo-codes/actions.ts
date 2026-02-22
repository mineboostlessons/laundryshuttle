"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";

// =============================================================================
// Schemas
// =============================================================================

const createPromoSchema = z.object({
  code: z.string().min(1).max(32),
  description: z.string().optional(),
  discountType: z.enum(["percentage", "flat_amount", "free_delivery"]),
  discountValue: z.number().min(0),
  minOrderAmount: z.number().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  maxUsesPerCustomer: z.number().int().min(1).optional(),
  validFrom: z.string().min(1),
  validUntil: z.string().optional(),
});

const updatePromoSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  maxUses: z.number().int().min(1).optional(),
  validUntil: z.string().optional(),
  isActive: z.boolean().optional(),
});

// =============================================================================
// Create Promo Code
// =============================================================================

export async function createPromoCode(input: z.infer<typeof createPromoSchema>) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const parsed = createPromoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  // Check for duplicate code
  const existing = await prisma.promoCode.findUnique({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: data.code.toUpperCase(),
      },
    },
  });

  if (existing) {
    return { success: false, error: "A promo code with this code already exists" };
  }

  const promo = await prisma.promoCode.create({
    data: {
      tenantId: tenant.id,
      code: data.code.toUpperCase(),
      description: data.description,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderAmount: data.minOrderAmount,
      maxUses: data.maxUses,
      maxUsesPerCustomer: data.maxUsesPerCustomer ?? 1,
      validFrom: new Date(data.validFrom),
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
    },
  });

  return { success: true, promoId: promo.id };
}

// =============================================================================
// List Promo Codes
// =============================================================================

export async function listPromoCodes() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  return prisma.promoCode.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      description: true,
      discountType: true,
      discountValue: true,
      minOrderAmount: true,
      maxUses: true,
      maxUsesPerCustomer: true,
      currentUses: true,
      validFrom: true,
      validUntil: true,
      isActive: true,
      campaignType: true,
      createdAt: true,
    },
  });
}

// =============================================================================
// Update Promo Code
// =============================================================================

export async function updatePromoCode(input: z.infer<typeof updatePromoSchema>) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const parsed = updatePromoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { id, ...data } = parsed.data;

  const promo = await prisma.promoCode.findFirst({
    where: { id, tenantId: tenant.id },
  });

  if (!promo) {
    return { success: false, error: "Promo code not found" };
  }

  await prisma.promoCode.update({
    where: { id },
    data: {
      description: data.description,
      maxUses: data.maxUses,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      isActive: data.isActive,
    },
  });

  return { success: true };
}

// =============================================================================
// Deactivate Promo Code
// =============================================================================

export async function deactivatePromoCode(promoId: string) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const promo = await prisma.promoCode.findFirst({
    where: { id: promoId, tenantId: tenant.id },
  });

  if (!promo) {
    return { success: false, error: "Promo code not found" };
  }

  await prisma.promoCode.update({
    where: { id: promoId },
    data: { isActive: false },
  });

  return { success: true };
}
