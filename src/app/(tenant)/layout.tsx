import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/tenant";
import { ThemeProvider } from "@/components/theme/theme-provider";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");
  const customDomain = headersList.get("x-custom-domain");

  if (!customDomain && (!tenantSlug || tenantSlug === "__platform__")) return {};

  const tenant = await getCurrentTenant();
  if (!tenant) return {};

  const logoUrl = tenant.themeConfig?.logoUrl;

  return {
    title: {
      default: tenant.businessName,
      template: `%s | ${tenant.businessName}`,
    },
    ...(logoUrl && {
      icons: {
        icon: [{ url: logoUrl }],
        apple: logoUrl,
      },
    }),
  };
}

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");
  const customDomain = headersList.get("x-custom-domain");

  // Platform context — render children directly (marketing pages handle their own layout)
  if (!customDomain && (!tenantSlug || tenantSlug === "__platform__")) {
    return <>{children}</>;
  }

  const tenant = await getCurrentTenant();
  if (!tenant) {
    notFound();
  }

  return <ThemeProvider>{children}</ThemeProvider>;
}
