"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { z } from "zod";

export async function getMarketplaceApps() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const apps = await prisma.marketplaceApp.findMany({
    where: { isActive: true },
    include: {
      installations: {
        where: { tenantId: tenant.id },
        take: 1,
      },
    },
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
  });

  return apps.map((app) => ({
    ...app,
    isInstalled: app.installations.length > 0,
    installation: app.installations[0] ?? null,
  }));
}

export async function getInstalledApps() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  return prisma.tenantAppInstallation.findMany({
    where: { tenantId: tenant.id },
    include: {
      app: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

const appConfigSchema = z.record(z.string().max(1000)).refine(
  (obj) => Object.keys(obj).length <= 50,
  "Config cannot have more than 50 keys"
);

const installSchema = z.object({
  appId: z.string().min(1),
  config: appConfigSchema.optional(),
});

export async function installApp(data: z.infer<typeof installSchema>) {
  const session = await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const parsed = installSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0].message };
  }
  const validated = parsed.data;

  // Verify the app exists and is active
  const app = await prisma.marketplaceApp.findFirst({
    where: { id: validated.appId, isActive: true },
  });

  if (!app) {
    return { success: false as const, error: "App not found" };
  }

  // Check if already installed
  const existing = await prisma.tenantAppInstallation.findUnique({
    where: {
      tenantId_appId: { tenantId: tenant.id, appId: validated.appId },
    },
  });

  if (existing) {
    return { success: false as const, error: "App already installed" };
  }

  return prisma.tenantAppInstallation.create({
    data: {
      tenantId: tenant.id,
      appId: validated.appId,
      config: (validated.config ?? {}) as Record<string, string>,
      installedById: session.user.id,
      status: "active",
    },
    include: { app: true },
  });
}

export async function uninstallApp(appId: string) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  return prisma.tenantAppInstallation.delete({
    where: {
      tenantId_appId: { tenantId: tenant.id, appId },
    },
  });
}

export async function updateAppConfig(appId: string, config: Record<string, string>) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const parsedConfig = appConfigSchema.safeParse(config);
  if (!parsedConfig.success) {
    throw new Error(parsedConfig.error.errors[0].message);
  }

  return prisma.tenantAppInstallation.update({
    where: {
      tenantId_appId: { tenantId: tenant.id, appId },
    },
    data: { config: parsedConfig.data },
    include: { app: true },
  });
}

const toggleStatusSchema = z.object({
  appId: z.string().min(1),
  status: z.enum(["active", "paused"]),
});

export async function toggleAppStatus(appId: string, status: "active" | "paused") {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const parsed = toggleStatusSchema.safeParse({ appId, status });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0].message);
  }

  return prisma.tenantAppInstallation.update({
    where: {
      tenantId_appId: { tenantId: tenant.id, appId: parsed.data.appId },
    },
    data: { status: parsed.data.status },
    include: { app: true },
  });
}
