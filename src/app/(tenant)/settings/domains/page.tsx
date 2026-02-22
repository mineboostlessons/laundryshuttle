import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { getCustomDomainStatus } from "@/lib/custom-domains";
import { DomainManager } from "./domain-manager";

export default async function DomainsSettingsPage() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();
  const domainStatus = await getCustomDomainStatus(tenant.id);

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/settings" className="hover:text-foreground">
              Settings
            </Link>
            <span>/</span>
            <span className="text-foreground">Custom Domain</span>
          </div>
          <h1 className="mt-2 text-xl font-bold">Custom Domain</h1>
          <p className="text-sm text-muted-foreground">
            Connect your own domain name to your laundry website
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl p-6">
        <DomainManager
          tenantSlug={tenant.slug}
          currentDomain={domainStatus.currentDomain}
          verification={domainStatus.verification}
        />
      </div>
    </main>
  );
}
