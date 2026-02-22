"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface ServiceData {
  name: string;
  revenue: number;
  count: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(221, 83%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
  "hsl(47, 96%, 53%)",
  "hsl(330, 81%, 60%)",
  "hsl(174, 72%, 40%)",
];

export function ServiceBreakdownChart({ data }: { data: ServiceData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No service data for this period
      </div>
    );
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div className="flex flex-col lg:flex-row items-center gap-4">
      <div className="w-full lg:w-1/2">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={50}
              paddingAngle={2}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as ServiceData;
                const pct = totalRevenue > 0
                  ? ((d.revenue / totalRevenue) * 100).toFixed(1)
                  : "0";
                return (
                  <div className="rounded-md border bg-background p-3 shadow-sm">
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(d.revenue)} ({pct}%)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {d.count} orders
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full lg:w-1/2 space-y-2">
        {data.map((service, i) => {
          const pct = totalRevenue > 0
            ? ((service.revenue / totalRevenue) * 100).toFixed(1)
            : "0";
          return (
            <div key={service.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="truncate">{service.name}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-muted-foreground">{pct}%</span>
                <span className="font-medium">{formatCurrency(service.revenue)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
