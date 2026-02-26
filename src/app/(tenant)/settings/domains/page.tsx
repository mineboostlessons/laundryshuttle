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
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Custom Domain</h1>
        <p className="text-muted-foreground">
          Connect your own domain name to your laundry website
        </p>
      </div>

      <DomainManager
        tenantSlug={tenant.slug}
        currentDomain={domainStatus.currentDomain}
        verification={domainStatus.verification}
      />
    </div>
  );
}
