"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import prisma from "@/lib/prisma";
import type { ThemePreset } from "@/types/theme";

export async function updateTenantTheme(preset: string) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const parsed = z.enum(["clean_luxe", "fresh_wave", "eco_zen", "neon_express", "soft_cloud", "metro_editorial"]).safeParse(preset);
  if (!parsed.success) {
    return { success: false, error: "Invalid theme preset" };
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { themePreset: parsed.data },
  });

  return { success: true };
}

export async function updateTenantLogo(logoUrl: string | null) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const fullTenant = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: { themeConfig: true },
  });

  const currentConfig = (fullTenant?.themeConfig as Record<string, unknown>) || {};

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      themeConfig: {
        ...currentConfig,
        logoUrl: logoUrl,
      },
    },
  });

  return { success: true };
}

export async function getTenantThemeSettings() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const data = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      themePreset: true,
      themeConfig: true,
    },
  });

  return {
    preset: (data?.themePreset || "clean_luxe") as ThemePreset,
    logoUrl: (data?.themeConfig as Record<string, string> | null)?.logoUrl || null,
  };
}
