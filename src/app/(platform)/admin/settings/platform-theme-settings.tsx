"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { THEME_PRESETS } from "@/lib/theme";
import type { ThemePreset } from "@/types/theme";
import { updatePlatformTheme } from "./actions";
import { Check, Loader2 } from "lucide-react";

const PRESET_INFO: Record<ThemePreset, { label: string; description: string }> = {
  clean_luxe: { label: "Clean Luxe", description: "Navy & gold premium" },
  fresh_wave: { label: "Fresh Wave", description: "Blue & mint modern" },
  eco_zen: { label: "Eco Zen", description: "Forest & sage natural" },
  neon_express: { label: "Neon Express", description: "Violet & cyan dark" },
  soft_cloud: { label: "Soft Cloud", description: "Lavender & yellow friendly" },
  metro_editorial: { label: "Metro Editorial", description: "Black & red editorial" },
};

export function PlatformThemeSettings({
  currentPreset,
}: {
  currentPreset: ThemePreset;
}) {
  const router = useRouter();
  const [preset, setPreset] = useState(currentPreset);
  const [saving, setSaving] = useState(false);

  const handleChange = async (newPreset: ThemePreset) => {
    setPreset(newPreset);
    setSaving(true);
    try {
      await updatePlatformTheme(newPreset);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Theme</CardTitle>
        <CardDescription>
          Choose a color theme for the platform admin dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((key) => {
            const info = PRESET_INFO[key];
            const colors = THEME_PRESETS[key];
            const isSelected = preset === key;

            return (
              <button
                key={key}
                onClick={() => handleChange(key)}
                disabled={saving}
                className={cn(
                  "relative rounded-lg border-2 p-4 text-left transition-all hover:shadow-md",
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                )}
              >
                {isSelected && (
                  <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                <div className="flex gap-1.5 mb-3">
                  <div
                    className="h-8 w-8 rounded-full border"
                    style={{ backgroundColor: `hsl(${colors.primary})` }}
                  />
                  <div
                    className="h-8 w-8 rounded-full border"
                    style={{ backgroundColor: `hsl(${colors.accent})` }}
                  />
                  <div
                    className="h-8 w-8 rounded-full border"
                    style={{ backgroundColor: `hsl(${colors.background})` }}
                  />
                  <div
                    className="h-8 w-8 rounded-full border"
                    style={{ backgroundColor: `hsl(${colors.muted})` }}
                  />
                </div>
                <p className="font-medium text-sm">{info.label}</p>
                <p className="text-xs text-muted-foreground">{info.description}</p>
              </button>
            );
          })}
        </div>
        {saving && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Applying theme...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
