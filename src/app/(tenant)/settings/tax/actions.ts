"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";

// =============================================================================
// Get Tax Settings
// =============================================================================

export async function getTaxSettings() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const tenantData = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      defaultTaxRate: true,
    },
  });

  return {
    defaultTaxRate: tenantData?.defaultTaxRate ?? 0,
  };
}

// =============================================================================
// Update Tax Settings
// =============================================================================

const updateTaxSettingsSchema = z.object({
  defaultTaxRate: z
    .number()
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%"),
});

export async function updateTaxSettings(
  input: z.infer<typeof updateTaxSettingsSchema>
) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const parsed = updateTaxSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0].message };
  }

  // Convert percentage to decimal for storage (e.g., 8.875 → 0.08875)
  const rateAsDecimal = parsed.data.defaultTaxRate / 100;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      defaultTaxRate: rateAsDecimal,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/settings/tax");

  return { success: true as const };
}
