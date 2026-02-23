"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import prisma from "@/lib/prisma";
import type { ThemePreset } from "@/types/theme";

export async function getPlatformSettings() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  let settings = await prisma.platformSettings.findUnique({
    where: { id: "platform" },
  });

  // Auto-create if doesn't exist
  if (!settings) {
    settings = await prisma.platformSettings.create({
      data: { id: "platform", theme: "modern" },
    });
  }

  return {
    theme: settings.theme as ThemePreset,
    logoUrl: settings.logoUrl,
  };
}

export async function updatePlatformTheme(preset: string) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const parsed = z.enum(["modern", "classic", "bold", "minimal", "warm", "ocean"]).safeParse(preset);
  if (!parsed.success) {
    return { success: false, error: "Invalid theme preset" };
  }

  await prisma.platformSettings.upsert({
    where: { id: "platform" },
    update: { theme: parsed.data },
    create: { id: "platform", theme: parsed.data },
  });

  return { success: true };
}
