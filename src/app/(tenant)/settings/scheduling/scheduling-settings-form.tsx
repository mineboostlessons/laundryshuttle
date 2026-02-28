"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSchedulingSettings } from "./actions";

interface SchedulingSettingsFormProps {
  settings: {
    laundromatId: string;
    sameDayPickupEnabled: boolean;
    sameDayPickupCutoff: string | null;
    sameDayPickupFee: number;
    sameDayCutoffHours: number;
  };
}

export function SchedulingSettingsForm({ settings }: SchedulingSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [enabled, setEnabled] = useState(settings.sameDayPickupEnabled);
  const [cutoff, setCutoff] = useState(settings.sameDayPickupCutoff ?? "14:00");
  const [fee, setFee] = useState(String(settings.sameDayPickupFee));
  const [cutoffHours, setCutoffHours] = useState(String(settings.sameDayCutoffHours));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateSchedulingSettings({
        laundromatId: settings.laundromatId,
        sameDayPickupEnabled: enabled,
        sameDayPickupCutoff: enabled ? cutoff : null,
        sameDayPickupFee: parseFloat(fee) || 0,
        sameDayCutoffHours: parseInt(cutoffHours, 10) || 3,
      });

      if (result.success) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error ?? "Failed to save settings");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Same-Day Pickup</CardTitle>
          <CardDescription>
            Allow customers to request pickup on the same day they place an order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="same-day-toggle">Enable same-day pickup</Label>
              <p className="text-sm text-muted-foreground">
                Customers will see today as an available pickup date
              </p>
            </div>
            <Switch
              id="same-day-toggle"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="cutoff-time">Global cutoff time</Label>
                <Input
                  id="cutoff-time"
                  type="time"
                  value={cutoff}
                  onChange={(e) => setCutoff(e.target.value)}
                  className="w-40"
                />
                <p className="text-xs text-muted-foreground">
                  Orders placed after this time cannot be picked up today
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="same-day-fee">Same-day pickup fee ($)</Label>
                <Input
                  id="same-day-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className="w-40"
                />
                <p className="text-xs text-muted-foreground">
                  Extra charge added to orders with same-day pickup
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cutoff-hours">Driver shift cutoff (hours)</Label>
                <Input
                  id="cutoff-hours"
                  type="number"
                  min="1"
                  max="12"
                  value={cutoffHours}
                  onChange={(e) => setCutoffHours(e.target.value)}
                  className="w-40"
                />
                <p className="text-xs text-muted-foreground">
                  Stops offering same-day pickup this many hours before the zone driver&apos;s shift ends
                </p>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600">Settings saved successfully.</p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
