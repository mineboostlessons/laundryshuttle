"use client";

import { useState, useTransition } from "react";
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
  Sparkles,
  Send,
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { WinBackCandidate, CampaignStats } from "@/lib/upsell";
import { runWinBackCampaign } from "./actions";

interface WinBackData {
  mild: WinBackCandidate[];
  moderate: WinBackCandidate[];
  urgent: WinBackCandidate[];
}

interface CampaignResult {
  created: number;
  sent: number;
  failed: number;
  errors: string[];
}

const TIER_CONFIG = {
  mild: {
    label: "Mild (14-20 days)",
    description: "Haven't ordered in 2-3 weeks",
    discount: "10%",
    icon: Clock,
    variant: "warning" as const,
  },
  moderate: {
    label: "Moderate (21-44 days)",
    description: "Haven't ordered in 3-6 weeks",
    discount: "15%",
    icon: AlertTriangle,
    variant: "default" as const,
  },
  urgent: {
    label: "Urgent (45+ days)",
    description: "Haven't ordered in 6+ weeks",
    discount: "20%",
    icon: AlertTriangle,
    variant: "destructive" as const,
  },
};

const CAMPAIGN_LABELS: Record<string, string> = {
  winback_14d: "Mild (14-day)",
  winback_21d: "Moderate (21-day)",
  winback_45d: "Urgent (45-day)",
};

export function CampaignsView({
  initialData,
  initialStats,
}: {
  initialData: WinBackData;
  initialStats: CampaignStats[];
}) {
  const [data] = useState(initialData);
  const [results, setResults] = useState<Record<string, CampaignResult>>({});
  const [isPending, startTransition] = useTransition();

  const handleRunCampaign = (tier: "mild" | "moderate" | "urgent") => {
    startTransition(async () => {
      const result = await runWinBackCampaign(tier);
      setResults((prev) => ({ ...prev, [tier]: result }));
    });
  };

  const totalAtRisk = data.mild.length + data.moderate.length + data.urgent.length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Win-Back Campaigns</h1>
        <p className="text-muted-foreground">
          Re-engage inactive customers with personalized promo codes sent via email & SMS
        </p>
      </div>

      {/* Campaign Performance Analytics */}
      {initialStats.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Campaign Performance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {initialStats.map((stat) => (
                <div
                  key={stat.campaignType}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <p className="text-sm font-medium">
                    {CAMPAIGN_LABELS[stat.campaignType] ?? stat.campaignType}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Codes Sent</p>
                      <p className="font-semibold">{stat.totalCodes}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Redeemed</p>
                      <p className="font-semibold">{stat.redeemedCodes}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Redemption Rate</p>
                      <p className="font-semibold">
                        {stat.redemptionRate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue Recovered</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(stat.revenueRecovered)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">At-Risk Customers</p>
                <p className="text-xl font-bold">{totalAtRisk}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {(["mild", "moderate", "urgent"] as const).map((tier) => {
          const config = TIER_CONFIG[tier];
          const count = data[tier].length;
          return (
            <Card key={tier}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <config.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                    <p className="text-xl font-bold">{count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Campaign Tiers */}
      {(["mild", "moderate", "urgent"] as const).map((tier) => {
        const config = TIER_CONFIG[tier];
        const candidates = data[tier];
        const result = results[tier];

        return (
          <Card key={tier}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{config.label}</CardTitle>
                    <CardDescription>
                      {config.description} &mdash; {config.discount} discount offer
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {result && (
                    <div className="flex gap-2">
                      <Badge variant="success">
                        {result.sent} sent
                      </Badge>
                      {result.failed > 0 && (
                        <Badge variant="destructive">
                          {result.failed} failed
                        </Badge>
                      )}
                    </div>
                  )}
                  <Button
                    onClick={() => handleRunCampaign(tier)}
                    disabled={isPending || candidates.length === 0}
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Campaign ({candidates.length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            {candidates.length > 0 && (
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Customer</th>
                        <th className="pb-2 font-medium">Days Inactive</th>
                        <th className="pb-2 font-medium text-right">Total Orders</th>
                        <th className="pb-2 font-medium text-right">Lifetime Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.slice(0, 10).map((c) => (
                        <tr key={c.userId} className="border-b last:border-0">
                          <td className="py-2">
                            <p className="font-medium">
                              {c.firstName ?? c.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {c.email}
                            </p>
                          </td>
                          <td className="py-2">
                            <Badge variant={config.variant}>
                              {c.daysSinceLastOrder}d
                            </Badge>
                          </td>
                          <td className="py-2 text-right">{c.totalOrders}</td>
                          <td className="py-2 text-right font-medium">
                            {formatCurrency(c.totalSpent)}
                          </td>
                        </tr>
                      ))}
                      {candidates.length > 10 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-2 text-center text-muted-foreground"
                          >
                            + {candidates.length - 10} more customers
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
