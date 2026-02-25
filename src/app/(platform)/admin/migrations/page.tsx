import type { Metadata } from "next";
import { getAllMigrationLogs, getMigrationStats } from "./actions";

export const metadata: Metadata = {
  title: "Migration Logs — Admin",
};

export default async function AdminMigrationsPage() {
  const [logs, stats] = await Promise.all([
    getAllMigrationLogs(),
    getMigrationStats(),
  ]);

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    processing: "bg-blue-100 text-blue-700",
    pending: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Migration Logs</h1>
        <p className="text-muted-foreground">
          Platform-wide data migration activity across all tenants
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Migrations</div>
          <div className="mt-1 text-2xl font-bold">{stats.totalMigrations}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="mt-1 text-2xl font-bold text-green-600">
            {stats.completedMigrations}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Failed</div>
          <div className="mt-1 text-2xl font-bold text-red-600">
            {stats.failedMigrations}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Records Imported</div>
          <div className="mt-1 text-2xl font-bold">
            {stats.totalRecordsImported.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Tenants Using</div>
          <div className="mt-1 text-2xl font-bold">
            {stats.tenantsWithMigrations}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Tenant</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
              <th className="px-4 py-2 text-right font-medium">Success</th>
              <th className="px-4 py-2 text-right font-medium">Failed</th>
              <th className="px-4 py-2 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No migrations yet
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="px-4 py-2">
                    <div className="font-medium">{log.tenant.businessName}</div>
                    <div className="text-xs text-muted-foreground">{log.tenant.slug}</div>
                  </td>
                  <td className="px-4 py-2 capitalize">
                    {log.operationType.replace("import_", "").replace("_", " ")}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColors[log.status] ?? "bg-gray-100"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{log.totalRecords}</td>
                  <td className="px-4 py-2 text-right text-green-600">{log.successCount}</td>
                  <td className="px-4 py-2 text-right text-red-600">{log.failedCount}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
