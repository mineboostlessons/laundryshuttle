import { headers } from "next/headers";
import { getCurrentTenant } from "@/lib/tenant";
import { ThemeProvider } from "@/components/theme/theme-provider";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");
  const customDomain = headersList.get("x-custom-domain");

  let useTenantTheme = false;
  if (customDomain || (tenantSlug && tenantSlug !== "__platform__")) {
    const tenant = await getCurrentTenant();
    if (tenant) useTenantTheme = true;
  }

  const content = (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );

  if (useTenantTheme) {
    return <ThemeProvider>{content}</ThemeProvider>;
  }

  return content;
}
