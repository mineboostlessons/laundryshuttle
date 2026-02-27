import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/tenant";
import { ThemeProvider } from "@/components/theme/theme-provider";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");

  if (!tenantSlug || tenantSlug === "__platform__") return {};

  const tenant = await getCurrentTenant();
  if (!tenant) return {};

  const logoUrl = tenant.themeConfig?.logoUrl;
  if (!logoUrl) return {};

  // Use the uploaded logo as favicon and apple touch icon for this tenant
  return {
    icons: {
      icon: [{ url: logoUrl }],
      apple: logoUrl,
    },
  };
}

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");

  // Platform context — render children directly (marketing pages handle their own layout)
  if (!tenantSlug || tenantSlug === "__platform__") {
    return <>{children}</>;
  }

  const tenant = await getCurrentTenant();
  if (!tenant) {
    notFound();
  }

  return <ThemeProvider>{children}</ThemeProvider>;
}
