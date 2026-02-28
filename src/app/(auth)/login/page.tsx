import { Suspense } from "react";
import { headers } from "next/headers";
import { getCurrentTenant } from "@/lib/tenant";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") || "";
  const customDomain = headersList.get("x-custom-domain");

  // For custom domains, resolve the tenant slug from the database
  let resolvedSlug = tenantSlug;
  if (customDomain && (!tenantSlug || tenantSlug === "__platform__")) {
    const tenant = await getCurrentTenant();
    if (tenant) {
      resolvedSlug = tenant.slug;
    }
  }

  return (
    <Suspense fallback={<div className="h-[500px]" />}>
      <LoginForm tenantSlug={resolvedSlug} />
    </Suspense>
  );
}
