import { getSystemStatus } from "./actions";

export default async function SystemStatusPage() {
  const status = await getSystemStatus();

  const healthyCount = status.services.filter((s) => s.status === "healthy").length;
  const totalServices = status.services.length;
  const overallHealthy = status.services.every((s) => s.status !== "unhealthy");

  const uptimeHours = Math.floor(status.appInfo.uptime / 3600);
  const uptimeMinutes = Math.floor((status.appInfo.uptime % 3600) / 60);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Status</h1>
          <p className="text-sm text-muted-foreground">
            Monitor service health, environment configuration, and cron jobs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              overallHealthy ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm font-medium">
            {overallHealthy ? "All Systems Operational" : "Issues Detected"}
          </span>
        </div>
      </div>

      {/* App Info */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <InfoCard label="Version" value={`v${status.appInfo.version}`} />
        <InfoCard label="Environment" value={status.appInfo.nodeEnv} />
        <InfoCard label="Uptime" value={`${uptimeHours}h ${uptimeMinutes}m`} />
        <InfoCard
          label="Services"
          value={`${healthyCount}/${totalServices} healthy`}
        />
      </div>

      {/* Service Health */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Service Health</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {status.services.map((service) => (
            <div key={service.name} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{service.name}</span>
                <StatusBadge status={service.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{service.message}</p>
              {service.latencyMs !== undefined && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Latency: {service.latencyMs}ms
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Database */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Database</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <InfoCard
            label="Connection"
            value={status.database.connected ? "Connected" : "Disconnected"}
            accent={status.database.connected ? "green" : "red"}
          />
          <InfoCard label="Latency" value={`${status.database.latencyMs}ms`} />
          <InfoCard label="Tenants" value={status.database.tenantCount.toLocaleString()} />
          <InfoCard label="Total Orders" value={status.database.orderCount.toLocaleString()} />
        </div>
      </section>

      {/* Environment Variables */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Environment Variables</h2>
        <div className="rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Variable</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Required</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {status.envChecks.map((env) => (
                <tr key={env.name} className="border-b last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{env.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{env.category}</td>
                  <td className="px-4 py-2">
                    {env.required ? (
                      <span className="text-xs font-medium text-red-600">Required</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Optional</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {env.configured ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                        Set
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Missing
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cron Jobs */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Scheduled Cron Jobs</h2>
        <div className="rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Job</th>
                <th className="px-4 py-2 font-medium">Path</th>
                <th className="px-4 py-2 font-medium">Schedule (cron)</th>
                <th className="px-4 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {status.crons.map((cron) => (
                <tr key={cron.path} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{cron.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {cron.path}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{cron.schedule}</td>
                  <td className="px-4 py-2 text-muted-foreground">{cron.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Cron jobs are configured in vercel.json and authenticated via CRON_SECRET bearer token.
        </p>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: "healthy" | "degraded" | "unhealthy" }) {
  const styles = {
    healthy: "bg-green-100 text-green-700",
    degraded: "bg-amber-100 text-amber-700",
    unhealthy: "bg-red-100 text-red-700",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function InfoCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "red";
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${
          accent === "green" ? "text-green-600" : accent === "red" ? "text-red-600" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
