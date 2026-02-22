"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { z } from "zod";

const createAppSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1),
  description: z.string().min(1),
  shortDescription: z.string().optional(),
  iconUrl: z.string().url().optional(),
  category: z.enum(["automation", "accounting", "communication", "analytics", "marketing"]),
  provider: z.string().min(1),
  docsUrl: z.string().url().optional(),
  isFeatured: z.boolean().optional(),
});

export async function getAdminMarketplaceApps() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  return prisma.marketplaceApp.findMany({
    include: {
      _count: { select: { installations: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createMarketplaceApp(data: z.infer<typeof createAppSchema>) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const validated = createAppSchema.parse(data);

  return prisma.marketplaceApp.create({
    data: {
      slug: validated.slug,
      name: validated.name,
      description: validated.description,
      shortDescription: validated.shortDescription,
      iconUrl: validated.iconUrl,
      category: validated.category,
      provider: validated.provider,
      docsUrl: validated.docsUrl,
      isFeatured: validated.isFeatured ?? false,
    },
    include: {
      _count: { select: { installations: true } },
    },
  });
}

export async function toggleMarketplaceApp(appId: string, isActive: boolean) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  return prisma.marketplaceApp.update({
    where: { id: appId },
    data: { isActive },
    include: {
      _count: { select: { installations: true } },
    },
  });
}

export async function deleteMarketplaceApp(appId: string) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  // Check for existing installations
  const count = await prisma.tenantAppInstallation.count({
    where: { appId },
  });

  if (count > 0) {
    throw new Error(`Cannot delete app with ${count} active installation(s). Deactivate it instead.`);
  }

  return prisma.marketplaceApp.delete({ where: { id: appId } });
}

/**
 * Seed default marketplace apps (call once during setup).
 */
export async function seedDefaultApps() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const defaultApps = [
    {
      slug: "zapier",
      name: "Zapier",
      description: "Connect Laundry Shuttle to 5,000+ apps. Automate workflows like syncing new orders to Google Sheets, sending Slack notifications on delivery, or creating QuickBooks invoices automatically.",
      shortDescription: "Automate workflows with 5,000+ apps",
      category: "automation",
      provider: "zapier",
      docsUrl: "https://zapier.com/apps",
      isFeatured: true,
    },
    {
      slug: "quickbooks",
      name: "QuickBooks Online",
      description: "Automatically sync invoices, payments, and customer records with QuickBooks Online. Simplify your bookkeeping and keep financial records accurate without manual data entry.",
      shortDescription: "Sync invoices and payments with QuickBooks",
      category: "accounting",
      provider: "quickbooks",
      isFeatured: true,
    },
    {
      slug: "google-sheets",
      name: "Google Sheets",
      description: "Export order data, customer lists, and financial reports to Google Sheets automatically. Build custom reports and share data with your team.",
      shortDescription: "Export data to Google Sheets automatically",
      category: "analytics",
      provider: "google",
    },
    {
      slug: "slack",
      name: "Slack Notifications",
      description: "Get real-time notifications in Slack for new orders, completed deliveries, customer reviews, and more. Keep your team informed without checking the dashboard.",
      shortDescription: "Real-time order notifications in Slack",
      category: "communication",
      provider: "slack",
    },
    {
      slug: "mailchimp",
      name: "Mailchimp",
      description: "Sync customer data to Mailchimp for email marketing campaigns. Segment customers by order frequency, spend, and preferences for targeted promotions.",
      shortDescription: "Sync customers for email marketing",
      category: "marketing",
      provider: "mailchimp",
    },
  ];

  const results = [];
  for (const app of defaultApps) {
    const existing = await prisma.marketplaceApp.findUnique({
      where: { slug: app.slug },
    });
    if (!existing) {
      const created = await prisma.marketplaceApp.create({
        data: app,
      });
      results.push(created);
    }
  }

  return { created: results.length, total: defaultApps.length };
}
