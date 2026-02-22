"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";

interface AddonSuggestion {
  serviceId: string;
  name: string;
  coOccurrenceRate: number;
}

export function CheckoutUpsell({
  addons,
  onAdd,
}: {
  addons: AddonSuggestion[];
  onAdd: (serviceId: string) => void;
}) {
  const [added, setAdded] = useState<Set<string>>(new Set());

  if (addons.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">
        Customers also add...
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {addons.map((addon) => (
          <Card
            key={addon.serviceId}
            className={`transition-colors ${
              added.has(addon.serviceId)
                ? "border-primary/40 bg-primary/5"
                : "hover:border-primary/20"
            }`}
          >
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{addon.name}</p>
                <p className="text-xs text-muted-foreground">
                  {addon.coOccurrenceRate}% of customers add this
                </p>
              </div>
              <Button
                variant={added.has(addon.serviceId) ? "default" : "outline"}
                size="sm"
                className="flex-shrink-0"
                onClick={() => {
                  if (!added.has(addon.serviceId)) {
                    setAdded((prev) => new Set(prev).add(addon.serviceId));
                    onAdd(addon.serviceId);
                  }
                }}
                disabled={added.has(addon.serviceId)}
              >
                {added.has(addon.serviceId) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
