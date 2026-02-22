"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PreferencesStepProps {
  preferences: {
    detergent: string;
    waterTemp: string;
    fabricSoftener: boolean;
    dryerTemp: string;
  };
  specialInstructions: string;
  onChange: (partial: {
    preferences?: PreferencesStepProps["preferences"];
    specialInstructions?: string;
  }) => void;
}

const DETERGENT_OPTIONS = [
  { value: "regular", label: "Regular" },
  { value: "hypoallergenic", label: "Hypoallergenic" },
  { value: "fragrance_free", label: "Fragrance Free" },
  { value: "eco_friendly", label: "Eco-Friendly" },
];

const WATER_TEMP_OPTIONS = [
  { value: "cold", label: "Cold" },
  { value: "warm", label: "Warm" },
  { value: "hot", label: "Hot" },
];

const DRYER_TEMP_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "hang_dry", label: "Hang Dry" },
];

export function PreferencesStep({
  preferences,
  specialInstructions,
  onChange,
}: PreferencesStepProps) {
  const updatePref = (key: string, value: string | boolean) => {
    onChange({ preferences: { ...preferences, [key]: value } });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">
        Laundry Preferences
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell us how you like your laundry done. These are optional — we&apos;ll
        use our standard process if you skip this step.
      </p>

      <div className="mt-6 space-y-6">
        {/* Detergent */}
        <div>
          <Label className="mb-3 block font-medium">Detergent</Label>
          <div className="flex flex-wrap gap-2">
            {DETERGENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updatePref("detergent", opt.value)}
                className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                  preferences.detergent === opt.value
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "hover:border-muted-foreground/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Water Temperature */}
        <div>
          <Label className="mb-3 block font-medium">Water Temperature</Label>
          <div className="flex flex-wrap gap-2">
            {WATER_TEMP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updatePref("waterTemp", opt.value)}
                className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                  preferences.waterTemp === opt.value
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "hover:border-muted-foreground/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dryer Temperature */}
        <div>
          <Label className="mb-3 block font-medium">Dryer Temperature</Label>
          <div className="flex flex-wrap gap-2">
            {DRYER_TEMP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updatePref("dryerTemp", opt.value)}
                className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                  preferences.dryerTemp === opt.value
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "hover:border-muted-foreground/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fabric Softener */}
        <div>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={preferences.fabricSoftener}
              onChange={(e) =>
                updatePref("fabricSoftener", e.target.checked)
              }
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-foreground">
              Add Fabric Softener
            </span>
          </label>
        </div>

        {/* Special Instructions */}
        <div>
          <Label htmlFor="specialInstructions" className="mb-2 block font-medium">
            Special Instructions (optional)
          </Label>
          <Textarea
            id="specialInstructions"
            value={specialInstructions}
            onChange={(e) =>
              onChange({ specialInstructions: e.target.value })
            }
            placeholder="e.g., Separate darks and lights, starch on collared shirts, delicate cycle for silk items..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
