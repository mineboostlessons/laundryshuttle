import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");

  // If we have a tenant context, show the tenant homepage
  if (tenantSlug && tenantSlug !== "__platform__") {
    const tenant = await getCurrentTenant();
    if (tenant) {
      // Redirect to login page for now — tenant homepage is in (tenant) route group
      redirect("/login");
    }
  }

  // Platform context or no tenant — show platform landing
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Laundry Shuttle</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Multi-tenant SaaS platform for laundry pickup &amp; delivery
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Visit a tenant subdomain or <a href="/login" className="underline">log in</a> to get started.
      </p>
    </main>
  );
}
