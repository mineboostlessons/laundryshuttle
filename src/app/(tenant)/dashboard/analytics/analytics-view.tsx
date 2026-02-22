"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  ShoppingCart,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { RevenueTrendChart } from "./charts/revenue-trend-chart";
import { ServiceBreakdownChart } from "./charts/service-breakdown-chart";
import { ChannelChart } from "./charts/channel-chart";
import { CustomerGrowthChart } from "./charts/customer-growth-chart";
import {
  type DateRange,
  getAnalyticsKPIs,
  getRevenueTrend,
  getServiceBreakdown,
  getRevenueByChannel,
  getTopCustomers,
  getCustomerGrowth,
  getOrdersForExport,
} from "./actions";

interface AnalyticsData {
  kpis: Awaited<ReturnType<typeof getAnalyticsKPIs>>;
  revenueTrend: Awaited<ReturnType<typeof getRevenueTrend>>;
  serviceBreakdown: Awaited<ReturnType<typeof getServiceBreakdown>>;
  channelData: Awaited<ReturnType<typeof getRevenueByChannel>>;
  topCustomers: Awaited<ReturnType<typeof getTopCustomers>>;
  customerGrowth: Awaited<ReturnType<typeof getCustomerGrowth>>;
}

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "12m", label: "12 Months" },
];

export function AnalyticsView({ initialData, initialRange }: { initialData: AnalyticsData; initialRange: DateRange }) {
  const [range, setRange] = useState<DateRange>(initialRange);
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [isPending, startTransition] = useTransition();

  const handleRangeChange = useCallback((newRange: DateRange) => {
    setRange(newRange);
    startTransition(async () => {
      const [kpis, revenueTrend, serviceBreakdown, channelData, topCustomers, customerGrowth] =
        await Promise.all([
          getAnalyticsKPIs(newRange),
          getRevenueTrend(newRange),
          getServiceBreakdown(newRange),
          getRevenueByChannel(newRange),
          getTopCustomers(newRange),
          getCustomerGrowth(newRange),
        ]);
      setData({ kpis, revenueTrend, serviceBreakdown, channelData, topCustomers, customerGrowth });
    });
  }, []);

  const handleExport = useCallback(() => {
    startTransition(async () => {
      const rows = await getOrdersForExport(range);
      if (rows.length === 0) return;

      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(","),
        ...rows.map((r) =>
          headers.map((h) => {
            const val = r[h as keyof typeof r];
            return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
          }).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${range}-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [range]);

  const { kpis } = data;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Deep dive into your business performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-muted p-1">
            {DATE_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => handleRangeChange(r.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  range === r.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Loading overlay */}
      {isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Updating...
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Revenue"
          value={formatCurrency(kpis.revenue.value)}
          change={kpis.revenue.change}
          icon={DollarSign}
        />
        <KPICard
          title="Orders"
          value={kpis.orders.value.toLocaleString()}
          change={kpis.orders.change}
          icon={ShoppingCart}
        />
        <KPICard
          title="New Customers"
          value={kpis.newCustomers.value.toLocaleString()}
          change={kpis.newCustomers.change}
          icon={UserPlus}
        />
        <KPICard
          title="Avg Order Value"
          value={formatCurrency(kpis.avgOrderValue.value)}
          change={kpis.avgOrderValue.change}
          icon={BarChart3}
        />
      </div>

      {/* Subscriptions Badge */}
      {kpis.activeSubscriptions > 0 && (
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">
              {kpis.activeSubscriptions} active subscription{kpis.activeSubscriptions !== 1 ? "s" : ""}
            </span>
            <Badge variant="secondary">Recurring Revenue</Badge>
          </CardContent>
        </Card>
      )}

      {/* Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>
            Revenue and order volume over the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueTrendChart data={data.revenueTrend} range={range} />
        </CardContent>
      </Card>

      {/* Service Breakdown & Channel Split */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Service Breakdown</CardTitle>
                <CardDescription>Revenue by service type</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ServiceBreakdownChart data={data.serviceBreakdown} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Revenue by Channel</CardTitle>
                <CardDescription>Delivery vs Walk-in vs POS</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChannelChart data={data.channelData} />
          </CardContent>
        </Card>
      </div>

      {/* Customer Growth */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Growth</CardTitle>
          <CardDescription>New customer signups over time</CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerGrowthChart data={data.customerGrowth} range={range} />
        </CardContent>
      </Card>

      {/* Top Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
          <CardDescription>
            Highest spending customers in the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.topCustomers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No customer data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Orders</th>
                    <th className="pb-3 font-medium text-right">Total Spent</th>
                    <th className="pb-3 font-medium text-right hidden sm:table-cell">
                      Avg Order
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCustomers.map((customer, i) => (
                    <tr key={customer.id} className="border-b last:border-0">
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {customer.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-3">{customer.orderCount}</td>
                      <td className="py-3 text-right font-medium">
                        {formatCurrency(customer.totalSpent)}
                      </td>
                      <td className="py-3 text-right hidden sm:table-cell">
                        {formatCurrency(
                          customer.orderCount > 0
                            ? customer.totalSpent / customer.orderCount
                            : 0
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// KPI Card Component
// =============================================================================

function KPICard({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string;
  value: string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const isPositive = change >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-green-600" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-600" />
          )}
          <span
            className={`text-xs font-medium ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? "+" : ""}
            {change}%
          </span>
          <span className="text-xs text-muted-foreground">vs prior period</span>
        </div>
      </CardContent>
    </Card>
  );
}
