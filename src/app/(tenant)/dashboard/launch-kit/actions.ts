"use server";

import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/prisma";

export interface LaunchKitData {
  businessName: string;
  slug: string;
  customDomain: string | null;
  phone: string | null;
  email: string | null;
  orderUrl: string;
  websiteUrl: string;
  logoUrl: string | null;
  // Services summary
  services: Array<{ name: string; price: number; pricingType: string }>;
  // Location info
  location: {
    address: string;
    city: string;
    state: string;
    zip: string;
  } | null;
  // Launch readiness checklist
  checklist: Array<{ label: string; done: boolean }>;
}

export async function getLaunchKitData(): Promise<LaunchKitData> {
  await requireRole("owner");
  const tenant = await requireTenant();

  const fullTenant = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      businessName: true,
      slug: true,
      customDomain: true,
      phone: true,
      email: true,
      themeConfig: true,
      stripeConnectStatus: true,
      stripeOnboardingComplete: true,
      onboardingComplete: true,
      notificationSettings: true,
    },
  });

  if (!fullTenant) {
    throw new Error("Tenant not found");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://laundryshuttle.com";
  const websiteUrl = fullTenant.customDomain
    ? `https://${fullTenant.customDomain}`
    : `${baseUrl.replace("://", `://${fullTenant.slug}.`)}`;
  const orderUrl = `${websiteUrl}/order`;

  const themeConfig = fullTenant.themeConfig as Record<string, string> | null;

  // Fetch services
  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id, isActive: true },
    select: { name: true, price: true, pricingType: true },
    orderBy: { sortOrder: "asc" },
  });

  // Fetch primary location
  const location = await prisma.laundromat.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    select: { address: true, city: true, state: true, zip: true },
  });

  // Staff count
  const staffCount = await prisma.user.count({
    where: {
      tenantId: tenant.id,
      role: { in: ["manager", "attendant", "driver"] },
      isActive: true,
    },
  });

  // Pages published
  const publishedPages = await prisma.page.count({
    where: { tenantId: tenant.id, isPublished: true },
  });

  const notifSettings = fullTenant.notificationSettings as Record<string, boolean> | null;

  // Build launch readiness checklist
  const checklist = [
    {
      label: "Complete onboarding wizard",
      done: fullTenant.onboardingComplete,
    },
    {
      label: "Connect Stripe for payments",
      done: fullTenant.stripeOnboardingComplete,
    },
    {
      label: "Add at least one service",
      done: services.length > 0,
    },
    {
      label: "Add a location",
      done: location !== null,
    },
    {
      label: "Hire at least one staff member",
      done: staffCount > 0,
    },
    {
      label: "Publish at least one page",
      done: publishedPages > 0,
    },
    {
      label: "Configure notifications",
      done: notifSettings !== null,
    },
    {
      label: "Add business phone number",
      done: !!fullTenant.phone,
    },
    {
      label: "Add business email",
      done: !!fullTenant.email,
    },
  ];

  return {
    businessName: fullTenant.businessName,
    slug: fullTenant.slug,
    customDomain: fullTenant.customDomain,
    phone: fullTenant.phone,
    email: fullTenant.email,
    orderUrl,
    websiteUrl,
    logoUrl: themeConfig?.logoUrl ?? null,
    services,
    location: location
      ? {
          address: location.address,
          city: location.city,
          state: location.state,
          zip: location.zip,
        }
      : null,
    checklist,
  };
}
