import { Suspense } from "react";
import { headers } from "next/headers";
import { StaffLoginForm } from "./staff-login-form";

export default async function StaffLoginPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") || "";

  return (
    <Suspense fallback={<div className="h-[500px]" />}>
      <StaffLoginForm tenantSlug={tenantSlug} />
    </Suspense>
  );
}
