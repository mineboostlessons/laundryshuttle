"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateTaxSettings } from "./actions";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export function TaxSettingsView({
  initialRate,
}: {
  initialRate: number;
}) {
  // Convert decimal to percentage for display (e.g., 0.08875 → 8.875)
  const [rate, setRate] = useState((initialRate * 100).toString());
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const handleSave = () => {
    setMessage(null);
    const numericRate = parseFloat(rate);

    if (isNaN(numericRate) || numericRate < 0 || numericRate > 100) {
      setMessage({ type: "error", text: "Enter a valid rate between 0 and 100" });
      return;
    }

    startTransition(async () => {
      const result = await updateTaxSettings({ defaultTaxRate: numericRate });
      if (result.success) {
        setMessage({ type: "success", text: "Tax rate saved" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Settings
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default Tax Rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Label htmlFor="tax-rate">Tax Rate (%)</Label>
            <div className="relative mt-1">
              <Input
                id="tax-rate"
                type="number"
                min="0"
                max="100"
                step="0.001"
                placeholder="0.000"
                value={rate}
                onChange={(e) => {
                  setRate(e.target.value);
                  setMessage(null);
                }}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Applied to taxable items in POS and online orders. For example, enter 8.875 for 8.875%.
            </p>
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.type === "success"
                  ? "text-green-600"
                  : "text-destructive"
              }`}
            >
              {message.text}
            </p>
          )}

          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
