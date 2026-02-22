import { headers } from "next/headers";
import { cache } from "react";
import prisma from "./prisma";

export interface TenantInfo {
  id: string;
  slug: string;
  businessName: string;
  isActive: boolean;
  themePreset: string;
  themeConfig: Record<string, string> | null;
}

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
    select: {
      id: true,
      slug: true,
      businessName: true,
      isActive: true,
      themePreset: true,
      themeConfig: true,
    },
  });

  if (!tenant || !tenant.isActive) return null;

  return {
    ...tenant,
    themeConfig: tenant.themeConfig as Record<string, string> | null,
  };
}

/**
 * Look up tenant by custom domain
 */
export async function getTenantByDomain(domain: string): Promise<TenantInfo | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { customDomain: domain },
    select: {
      id: true,
      slug: true,
      businessName: true,
      isActive: true,
      themePreset: true,
      themeConfig: true,
    },
  });

  if (!tenant || !tenant.isActive) return null;

  return {
    ...tenant,
    themeConfig: tenant.themeConfig as Record<string, string> | null,
  };
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

export interface TenantPublicInfo extends TenantInfo {
  phone: string | null;
  email: string | null;
  socialLinks: Record<string, string> | null;
  seoDefaults: SeoDefaults | null;
  customCss: string | null;
}

/**
 * Get full tenant info for public website rendering (header, footer, SEO).
 */
export const getFullTenantInfo = cache(async (): Promise<TenantPublicInfo | null> => {
  const basic = await getCurrentTenant();
  if (!basic) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: basic.id },
    select: {
      id: true,
      slug: true,
      businessName: true,
      isActive: true,
      themePreset: true,
      themeConfig: true,
      phone: true,
      email: true,
      socialLinks: true,
      seoDefaults: true,
      customCss: true,
    },
  });

  if (!tenant) return null;

  return {
    ...tenant,
    themeConfig: tenant.themeConfig as Record<string, string> | null,
    socialLinks: tenant.socialLinks as Record<string, string> | null,
    seoDefaults: tenant.seoDefaults as SeoDefaults | null,
  };
});
