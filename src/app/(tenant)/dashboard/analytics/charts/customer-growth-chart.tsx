"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { DateRange } from "../actions";

interface DataPoint {
  date: string;
  newCustomers: number;
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

export function CustomerGrowthChart({ data, range }: { data: DataPoint[]; range: DateRange }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        No customer data for this period
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: formatLabel(d.date, range),
  }));

  const tickInterval = Math.max(1, Math.floor(formatted.length / 7));

  return (
    <ResponsiveContainer width="100%" height={200}>
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
                  New Customers: {d.newCustomers}
                </p>
              </div>
            );
          }}
        />
        <Bar
          dataKey="newCustomers"
          fill="hsl(142, 71%, 45%)"
          radius={[4, 4, 0, 0]}
          opacity={0.8}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
