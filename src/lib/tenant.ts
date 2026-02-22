import { headers } from "next/headers";
import { cache } from "react";
import prisma from "./prisma";
import type { Tenant } from "@prisma/client";

// Use full Prisma Tenant type but loosen JSON fields for property access
export type TenantInfo = Omit<
  Tenant,
  "themeConfig" | "socialLinks" | "seoDefaults" | "notificationSettings" | "taxRegistrations" | "trustBadges"
> & {
  themeConfig: Record<string, string> | null;
  socialLinks: Record<string, string> | null;
  seoDefaults: SeoDefaults | null;
  notificationSettings: Record<string, unknown> | null;
  taxRegistrations: unknown;
  trustBadges: unknown;
};

/**
 * Get the current tenant from request headers.
 * Uses React cache() to deduplicate within a single request.
 */
export const getCurrentTenant = cache(async (): Promise<TenantInfo | null> => {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");
  const customDomain = headersList.get("x-custom-domain");

  // Platform admin context — no tenant
  if (tenantSlug === "__platform__") {
    return null;
  }

  if (tenantSlug) {
    return getTenantBySlug(tenantSlug);
  }

  if (customDomain) {
    return getTenantByDomain(customDomain);
  }

  return null;
});

/**
 * Look up tenant by slug
 */
export async function getTenantBySlug(slug: string): Promise<TenantInfo | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
  });

  if (!tenant || !tenant.isActive) return null;

  return tenant as unknown as TenantInfo;
}

/**
 * Look up tenant by custom domain
 */
export async function getTenantByDomain(domain: string): Promise<TenantInfo | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { customDomain: domain },
  });

  if (!tenant || !tenant.isActive) return null;

  return tenant as unknown as TenantInfo;
}

/**
 * Require a tenant in the current request context.
 * Throws if no tenant is found — use in tenant-scoped routes.
 */
export async function requireTenant(): Promise<TenantInfo> {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    throw new Error("Tenant not found");
  }
  return tenant;
}

export interface SeoDefaults {
  metaTitleTemplate?: string;
  metaDescriptionTemplate?: string;
  ogImageUrl?: string;
}

export type TenantPublicInfo = TenantInfo;

/**
 * Get full tenant info for public website rendering (header, footer, SEO).
 */
export const getFullTenantInfo = cache(async (): Promise<TenantPublicInfo | null> => {
  const basic = await getCurrentTenant();
  if (!basic) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: basic.id },
  });

  if (!tenant) return null;

  return tenant as unknown as TenantPublicInfo;
});
