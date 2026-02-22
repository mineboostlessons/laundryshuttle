"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { DateRange } from "../actions";

interface DataPoint {
  date: string;
  revenue: number;
  orders: number;
}

function formatLabel(date: string, range: DateRange): string {
  if (range === "12m") {
    const [year, month] = date.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1);
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RevenueTrendChart({ data, range }: { data: DataPoint[]; range: DateRange }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center text-muted-foreground">
        No revenue data for this period
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: formatLabel(d.date, range),
  }));

  // Show ~6-8 ticks regardless of data length
  const tickInterval = Math.max(1, Math.floor(formatted.length / 7));

  return (
    <div className="space-y-6">
      {/* Revenue Area */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Revenue</p>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="analyticsRevGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as DataPoint & { label: string };
                return (
                  <div className="rounded-md border bg-background p-3 shadow-sm">
                    <p className="text-sm font-medium">{d.label}</p>
                    <p className="text-sm text-muted-foreground">
                      Revenue: {formatCurrency(d.revenue)}
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              fill="url(#analyticsRevGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Orders Bar */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Orders</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as DataPoint & { label: string };
                return (
                  <div className="rounded-md border bg-background p-3 shadow-sm">
                    <p className="text-sm font-medium">{d.label}</p>
                    <p className="text-sm text-muted-foreground">
                      Orders: {d.orders}
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="orders"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
