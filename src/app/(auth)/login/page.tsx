import { Suspense } from "react";
import { headers } from "next/headers";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") || "";

  return (
    <Suspense fallback={<div className="h-[500px]" />}>
      <LoginForm tenantSlug={tenantSlug} />
    </Suspense>
  );
}
