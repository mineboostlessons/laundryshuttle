"use client";

import { useState, useTransition } from "react";
import { getBenchmarks, refreshBenchmarks } from "./actions";
import type { BenchmarkDashboard, BenchmarkMetric, BenchmarkComparison } from "@/lib/benchmarks";

interface BenchmarksViewProps {
  initialData: BenchmarkDashboard;
}

export function BenchmarksView({ initialData }: BenchmarksViewProps) {
  const [data, setData] = useState(initialData);
  const [period, setPeriod] = useState<"weekly" | "monthly">(
    initialData.period as "weekly" | "monthly"
  );
  const [isPending, startTransition] = useTransition();

  function handlePeriodChange(newPeriod: "weekly" | "monthly") {
    setPeriod(newPeriod);
    startTransition(async () => {
      const newData = await getBenchmarks(newPeriod);
      setData(newData);
    });
  }

  function handleRefresh() {
    startTransition(async () => {
      await refreshBenchmarks(period);
      const newData = await getBenchmarks(period);
      setData(newData);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Benchmarks</h1>
          <p className="text-muted-foreground">{data.periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <button
              onClick={() => handlePeriodChange("weekly")}
              className={`px-3 py-1.5 text-sm ${
                period === "weekly"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => handlePeriodChange("monthly")}
              className={`px-3 py-1.5 text-sm ${
                period === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              Monthly
            </button>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            {isPending ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      {/* Platform Comparison */}
      {Object.keys(data.comparisons).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Platform Comparison</h2>
          <p className="text-sm text-muted-foreground">
            See how you compare to other businesses on the platform
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data.comparisons).map(([key, comp]) => (
              <ComparisonCard key={key} label={formatLabel(key)} comparison={comp} />
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Period Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryItem
            label="Delivery Orders"
            value={data.snapshot.totalOrders.toString()}
            subtitle={`${data.snapshot.totalOrders > 0 ? Math.round((data.snapshot.totalOrders / Math.max(1, data.snapshot.totalOrders)) * 100) : 0}% of total`}
          />
          <SummaryItem
            label="New vs Returning"
            value={`${data.snapshot.newCustomers} / ${data.snapshot.returningCustomers}`}
            subtitle="New customers vs returning"
          />
          <SummaryItem
            label="Revenue Growth"
            value={`${data.snapshot.revenueGrowthRate > 0 ? "+" : ""}${data.snapshot.revenueGrowthRate.toFixed(1)}%`}
            subtitle="vs previous period"
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function MetricCard({ metric }: { metric: BenchmarkMetric }) {
  const trendColor =
    metric.trend === "flat"
      ? "text-muted-foreground"
      : (metric.trend === "up") === metric.isPositive
        ? "text-green-600"
        : "text-red-600";

  const trendArrow =
    metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "→";

  function formatValue(value: number, unit: string): string {
    if (unit === "$") return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    if (unit === "%") return `${value.toFixed(1)}%`;
    if (unit === "hours") return `${value.toFixed(1)}h`;
    if (unit === "stars") return value.toFixed(1);
    return value.toLocaleString();
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{metric.label}</div>
      <div className="mt-1 text-2xl font-bold">
        {formatValue(metric.value, metric.unit)}
      </div>
      <div className={`mt-1 flex items-center gap-1 text-sm ${trendColor}`}>
        <span>{trendArrow}</span>
        <span>
          {Math.abs(metric.changePercent).toFixed(1)}%
        </span>
        <span className="text-muted-foreground">vs prev</span>
      </div>
    </div>
  );
}

function ComparisonCard({
  label,
  comparison,
}: {
  label: string;
  comparison: BenchmarkComparison;
}) {
  const percentileColor =
    comparison.percentile >= 75
      ? "text-green-600"
      : comparison.percentile >= 50
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <div className="text-lg font-semibold">
            {comparison.tenantValue.toLocaleString("en-US", { maximumFractionDigits: 1 })}
          </div>
          <div className="text-xs text-muted-foreground">Your business</div>
        </div>
        <div className="text-right">
          <div className="text-lg text-muted-foreground">
            {comparison.platformAverage.toLocaleString("en-US", { maximumFractionDigits: 1 })}
          </div>
          <div className="text-xs text-muted-foreground">Platform avg</div>
        </div>
      </div>
      {/* Percentile bar */}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-muted-foreground">Percentile</span>
          <span className={`font-medium ${percentileColor}`}>
            Top {100 - comparison.percentile}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className={`h-2 rounded-full ${
              comparison.percentile >= 75
                ? "bg-green-500"
                : comparison.percentile >= 50
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${comparison.percentile}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
