import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { LocalDateOnly } from "@/components/ui/local-date";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ManagerReportsPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    thisMonthStats,
    lastMonthStats,
    topServices,
    openIssues,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        tenantId: tenant.id,
        createdAt: { gte: monthStart },
        status: { notIn: ["cancelled", "refunded"] },
      },
      _sum: { totalAmount: true },
      _count: true,
      _avg: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        tenantId: tenant.id,
        createdAt: { gte: lastMonthStart, lt: monthStart },
        status: { notIn: ["cancelled", "refunded"] },
      },
      _sum: { totalAmount: true },
      _count: true,
      _avg: { totalAmount: true },
    }),
    prisma.orderItem.groupBy({
      by: ["name"],
      where: {
        order: {
          tenantId: tenant.id,
          createdAt: { gte: monthStart },
        },
        itemType: "service",
      },
      _sum: { totalPrice: true },
      _count: { _all: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 5,
    }),
    prisma.issueReport.findMany({
      where: {
        order: { tenantId: tenant.id },
        status: { in: ["open", "investigating"] },
      },
      select: {
        id: true,
        issueType: true,
        status: true,
        createdAt: true,
        order: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Monthly summary and insights</p>
      </div>

      {/* Month Comparison */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(thisMonthStats._sum.totalAmount ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              vs {formatCurrency(lastMonthStats._sum.totalAmount ?? 0)} last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Orders This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthStats._count}</div>
            <p className="text-xs text-muted-foreground">
              vs {lastMonthStats._count} last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(thisMonthStats._avg.totalAmount ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              vs {formatCurrency(lastMonthStats._avg.totalAmount ?? 0)} last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Services */}
      <Card>
        <CardHeader>
          <CardTitle>Top Services This Month</CardTitle>
          <CardDescription>Most popular services by order count</CardDescription>
        </CardHeader>
        <CardContent>
          {topServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No service data yet</p>
          ) : (
            <div className="space-y-3">
              {topServices.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      #{i + 1}
                    </span>
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{s._count._all} orders</Badge>
                    <span className="text-sm font-medium">
                      {formatCurrency(s._sum?.totalPrice ?? 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Open Issues</CardTitle>
          <CardDescription>
            Issue reports requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {openIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open issues</p>
          ) : (
            <div className="space-y-3">
              {openIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {issue.issueType.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Order {issue.order.orderNumber} &middot;{" "}
                      <LocalDateOnly date={issue.createdAt} />
                    </p>
                  </div>
                  <Badge
                    variant={issue.status === "open" ? "warning" : "default"}
                  >
                    {issue.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
