import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://laundryshuttle.com";

  // Get all active tenants
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true, onboardingComplete: true },
    select: {
      slug: true,
      customDomain: true,
      updatedAt: true,
    },
  });

  // Get all published CMS pages
  const pages = await prisma.page.findMany({
    where: { isPublished: true },
    select: {
      slug: true,
      updatedAt: true,
      tenant: {
        select: {
          slug: true,
          customDomain: true,
          isActive: true,
        },
      },
    },
  });

  const entries: MetadataRoute.Sitemap = [
    // Platform homepage
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  // Tenant homepages
  for (const tenant of tenants) {
    const tenantUrl = tenant.customDomain
      ? `https://${tenant.customDomain}`
      : `${baseUrl.replace("://", `://${tenant.slug}.`)}`;

    entries.push({
      url: tenantUrl,
      lastModified: tenant.updatedAt,
      changeFrequency: "weekly",
      priority: 0.9,
    });

    // Ordering page
    entries.push({
      url: `${tenantUrl}/order`,
      lastModified: tenant.updatedAt,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  // Published CMS pages
  for (const page of pages) {
    if (!page.tenant.isActive) continue;

    const tenantUrl = page.tenant.customDomain
      ? `https://${page.tenant.customDomain}`
      : `${baseUrl.replace("://", `://${page.tenant.slug}.`)}`;

    entries.push({
      url: `${tenantUrl}/p/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
