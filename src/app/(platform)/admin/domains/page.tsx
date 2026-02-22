import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getAdminDomainData } from "./actions";
import { DomainActionsCell } from "./domain-actions-cell";

function statusBadgeVariant(status: string) {
  switch (status) {
    case "verified":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "failed":
    case "expired":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export default async function AdminDomainsPage() {
  await requireRole(UserRole.PLATFORM_ADMIN);
  const domains = await getAdminDomainData();

  const verified = domains.filter((d) => d.status === "verified").length;
  const pending = domains.filter((d) => d.status === "pending").length;
  const failed = domains.filter(
    (d) => d.status === "failed" || d.status === "expired"
  ).length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Custom Domains</h1>
        <p className="text-muted-foreground">
          Manage custom domain configurations across all tenants
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{domains.length}</p>
          <p className="text-sm text-muted-foreground">Total Domains</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{verified}</p>
          <p className="text-sm text-muted-foreground">Verified</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{pending}</p>
          <p className="text-sm text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{failed}</p>
          <p className="text-sm text-muted-foreground">Failed / Expired</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Domain</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Checks</th>
                <th className="px-4 py-3 font-medium">Last Checked</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono font-medium">
                    {d.domain}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/tenants/${d.tenantId}`}
                      className="text-primary hover:underline"
                    >
                      {d.tenant.businessName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {d.tenant.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(d.status)}>
                      {d.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {d.checkCount}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {d.lastCheckedAt
                      ? format(new Date(d.lastCheckedAt), "MMM d, HH:mm")
                      : "Never"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(d.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <DomainActionsCell
                      tenantId={d.tenantId}
                      domain={d.domain}
                      status={d.status}
                    />
                  </td>
                </tr>
              ))}
              {domains.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No custom domains configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
