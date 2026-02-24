import Link from "next/link";
import { getPlatformStats } from "./actions";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default async function AdminDashboardPage() {
  const stats = await getPlatformStats();

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Tenants" value={stats.totalTenants} href="/admin/tenants" />
        <StatCard label="Active Tenants" value={stats.activeTenants} accent="green" href="/admin/tenants" />
        <StatCard label="Total Users" value={stats.totalUsers} href="/admin/tenants" />
        <StatCard label="Total Orders" value={stats.totalOrders} href="/admin/tenants" />
      </div>

      {/* Recent Tenants */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Tenants</h2>
          <Link
            href="/admin/tenants"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Users</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentTenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        className="font-medium hover:underline"
                      >
                        {tenant.businessName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {tenant.slug}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={tenant.isActive ? "success" : "secondary"}>
                        {tenant.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{tenant._count.users}</td>
                    <td className="px-4 py-3">{tenant._count.orders}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDistanceToNow(tenant.createdAt, { addSuffix: true })}
                    </td>
                  </tr>
                ))}
                {stats.recentTenants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No tenants yet. They&apos;ll show up here once someone completes onboarding.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: number;
  accent?: "green" | "red";
  href: string;
}) {
  return (
    <Link href={href} className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-3xl font-bold ${
          accent === "green"
            ? "text-green-600"
            : accent === "red"
              ? "text-red-600"
              : ""
        }`}
      >
        {value}
      </p>
    </Link>
  );
}
