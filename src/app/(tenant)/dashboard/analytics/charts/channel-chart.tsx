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
import { formatCurrency } from "@/lib/utils";

interface ChannelData {
  channel: string;
  revenue: number;
  orders: number;
}

export function ChannelChart({ data }: { data: ChannelData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-muted-foreground">
        No channel data for this period
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
          />
          <YAxis
            type="category"
            dataKey="channel"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ChannelData;
              return (
                <div className="rounded-md border bg-background p-3 shadow-sm">
                  <p className="text-sm font-medium">{d.channel}</p>
                  <p className="text-sm text-muted-foreground">
                    Revenue: {formatCurrency(d.revenue)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Orders: {d.orders}
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="revenue"
            fill="hsl(var(--primary))"
            radius={[0, 4, 4, 0]}
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary below chart */}
      <div className="grid grid-cols-3 gap-3">
        {data.map((ch) => (
          <div key={ch.channel} className="text-center">
            <p className="text-lg font-bold">{formatCurrency(ch.revenue)}</p>
            <p className="text-xs text-muted-foreground">
              {ch.channel} &middot; {ch.orders} orders
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
