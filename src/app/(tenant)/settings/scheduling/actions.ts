"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { prisma } from "@/lib/prisma";

export async function getSchedulingSettings() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const laundromat = await prisma.laundromat.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    select: {
      id: true,
      sameDayPickupEnabled: true,
      sameDayPickupCutoff: true,
      sameDayPickupFee: true,
      sameDayCutoffHours: true,
    },
  });

  if (!laundromat) {
    return null;
  }

  return {
    laundromatId: laundromat.id,
    sameDayPickupEnabled: laundromat.sameDayPickupEnabled,
    sameDayPickupCutoff: laundromat.sameDayPickupCutoff,
    sameDayPickupFee: laundromat.sameDayPickupFee,
    sameDayCutoffHours: laundromat.sameDayCutoffHours,
  };
}

const updateSchema = z.object({
  laundromatId: z.string().min(1),
  sameDayPickupEnabled: z.boolean(),
  sameDayPickupCutoff: z.string().nullable(),
  sameDayPickupFee: z.number().min(0),
  sameDayCutoffHours: z.number().int().min(1).max(12),
});

export async function updateSchedulingSettings(data: {
  laundromatId: string;
  sameDayPickupEnabled: boolean;
  sameDayPickupCutoff: string | null;
  sameDayPickupFee: number;
  sameDayCutoffHours: number;
}): Promise<{ success: boolean; error?: string }> {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const parsed = updateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const laundromat = await prisma.laundromat.findFirst({
    where: { id: parsed.data.laundromatId, tenantId: tenant.id, isActive: true },
    select: { id: true },
  });

  if (!laundromat) {
    return { success: false, error: "Location not found" };
  }

  await prisma.laundromat.update({
    where: { id: laundromat.id },
    data: {
      sameDayPickupEnabled: parsed.data.sameDayPickupEnabled,
      sameDayPickupCutoff: parsed.data.sameDayPickupCutoff,
      sameDayPickupFee: parsed.data.sameDayPickupFee,
      sameDayCutoffHours: parsed.data.sameDayCutoffHours,
    },
  });

  revalidatePath("/settings/scheduling");
  return { success: true };
}
