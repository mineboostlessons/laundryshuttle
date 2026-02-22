"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePreferences } from "../actions";

interface PreferencesFormProps {
  initialData: {
    detergent: string;
    waterTemp: string;
    fabricSoftener: boolean;
    dryerTemp: string;
    specialInstructions: string;
  };
}

export function PreferencesForm({ initialData }: PreferencesFormProps) {
  const [form, setForm] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        await updatePreferences(form);
        setMessage("Preferences updated.");
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : "Failed to update preferences."
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Detergent</Label>
        <Select
          value={form.detergent || "standard"}
          onValueChange={(value) => setForm({ ...form, detergent: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select detergent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="hypoallergenic">Hypoallergenic</SelectItem>
            <SelectItem value="fragrance_free">Fragrance-Free</SelectItem>
            <SelectItem value="tide">Tide</SelectItem>
            <SelectItem value="persil">Persil</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Water Temperature</Label>
        <Select
          value={form.waterTemp || "warm"}
          onValueChange={(value) => setForm({ ...form, waterTemp: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select temperature" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cold">Cold</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Dryer Temperature</Label>
        <Select
          value={form.dryerTemp || "medium"}
          onValueChange={(value) => setForm({ ...form, dryerTemp: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select dryer temp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low Heat</SelectItem>
            <SelectItem value="medium">Medium Heat</SelectItem>
            <SelectItem value="high">High Heat</SelectItem>
            <SelectItem value="no_heat">No Heat (Air Dry)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="fabricSoftener"
          checked={form.fabricSoftener}
          onChange={(e) =>
            setForm({ ...form, fabricSoftener: e.target.checked })
          }
          className="rounded border-input"
        />
        <Label htmlFor="fabricSoftener" className="font-normal">
          Include fabric softener
        </Label>
      </div>

      <div>
        <Label htmlFor="specialInstructions">
          Standing Special Instructions
        </Label>
        <Textarea
          id="specialInstructions"
          placeholder="Any recurring instructions for every order..."
          value={form.specialInstructions}
          onChange={(e) =>
            setForm({ ...form, specialInstructions: e.target.value })
          }
          rows={3}
        />
      </div>

      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Preferences"}
      </Button>
    </form>
  );
}
