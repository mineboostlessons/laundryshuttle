"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Truck, Heart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getDriverEarnings } from "../actions";

interface EarningsData {
  totalTips: number;
  tipCount: number;
  averageTip: number;
  deliveriesCompleted: number;
  recentTips: Array<{
    id: string;
    amount: number;
    orderNumber: string;
    customerName: string;
    createdAt: string | Date;
  }>;
}

type Period = "today" | "week" | "month";

export function EarningsView({ initialData }: { initialData: EarningsData }) {
  const [data, setData] = useState(initialData);
  const [period, setPeriod] = useState<Period>("week");
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
    startTransition(async () => {
      const result = await getDriverEarnings({ period: newPeriod });
      setData(result);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Earnings & Tips</h2>
        <div className="flex gap-1 rounded-lg border p-0.5">
          {(["today", "week", "month"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "ghost"}
              size="sm"
              onClick={() => handlePeriodChange(p)}
              disabled={isPending}
              className="capitalize"
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Tips</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.totalTips)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Tip</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.averageTip)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Deliveries</p>
                <p className="text-2xl font-bold">
                  {data.deliveriesCompleted}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-pink-500" />
              <div>
                <p className="text-xs text-muted-foreground">Tips Received</p>
                <p className="text-2xl font-bold">{data.tipCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Tips</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentTips.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tips yet. Tips from customers will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {data.recentTips.map((tip) => (
                <div
                  key={tip.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {tip.customerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tip.orderNumber} &middot;{" "}
                      {new Date(tip.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-green-600">
                    +{formatCurrency(tip.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
