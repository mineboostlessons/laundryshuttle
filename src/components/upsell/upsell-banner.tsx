"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Sparkles, RefreshCw, Plus, TrendingUp } from "lucide-react";
import type { UpsellRecommendation } from "@/lib/upsell";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  subscription: RefreshCw,
  service_addon: Plus,
  frequency_upgrade: TrendingUp,
  winback: Sparkles,
};

export function UpsellBanner({
  recommendations,
}: {
  recommendations: UpsellRecommendation[];
}) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const visible = recommendations.filter((_, i) => !dismissed.has(i));
  if (visible.length === 0) return null;

  // Show only the highest priority recommendation
  const top = visible[0];
  const topIndex = recommendations.indexOf(top);
  const Icon = TYPE_ICONS[top.type] ?? Sparkles;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="rounded-full bg-primary/10 p-2.5 flex-shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{top.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {top.description}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={top.ctaUrl}>
            <Button size="sm">{top.ctaText}</Button>
          </Link>
          <button
            onClick={() => setDismissed((prev) => new Set(prev).add(topIndex))}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
