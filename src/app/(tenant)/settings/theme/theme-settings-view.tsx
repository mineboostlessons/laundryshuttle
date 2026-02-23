"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { cn } from "@/lib/utils";
import { THEME_PRESETS } from "@/lib/theme";
import type { ThemePreset } from "@/types/theme";
import { updateTenantTheme, updateTenantLogo } from "./actions";
import { Check, Loader2 } from "lucide-react";

const PRESET_INFO: Record<ThemePreset, { label: string; description: string }> = {
  modern: { label: "Modern", description: "Clean blue tones" },
  classic: { label: "Classic", description: "Emerald green feel" },
  bold: { label: "Bold", description: "Purple & violet premium" },
  minimal: { label: "Minimal", description: "Slate & neutral" },
  warm: { label: "Warm", description: "Orange & amber cozy" },
  ocean: { label: "Ocean", description: "Teal & cyan fresh" },
};

interface ThemeSettingsViewProps {
  currentPreset: ThemePreset;
  currentLogoUrl: string | null;
}

export function ThemeSettingsView({ currentPreset, currentLogoUrl }: ThemeSettingsViewProps) {
  const router = useRouter();
  const [preset, setPreset] = useState(currentPreset);
  const [savingTheme, setSavingTheme] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);

  const handlePresetChange = async (newPreset: ThemePreset) => {
    setPreset(newPreset);
    setSavingTheme(true);
    try {
      await updateTenantTheme(newPreset);
      router.refresh();
    } finally {
      setSavingTheme(false);
    }
  };

  const handleLogoChange = async (url: string | null) => {
    setSavingLogo(true);
    try {
      await updateTenantLogo(url);
      router.refresh();
    } finally {
      setSavingLogo(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>
            Upload your business logo. It will appear in your website header.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            value={currentLogoUrl}
            onChange={handleLogoChange}
            uploadType="logo"
            label="Upload Logo"
          />
          {savingLogo && (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Theme Preset Picker */}
      <Card>
        <CardHeader>
          <CardTitle>Color Theme</CardTitle>
          <CardDescription>
            Choose a color preset for your website. This applies to all pages.
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
                  onClick={() => handlePresetChange(key)}
                  disabled={savingTheme}
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

                  {/* Color swatches */}
                  <div className="flex gap-1.5 mb-3">
                    <div
                      className="h-8 w-8 rounded-full border"
                      style={{ backgroundColor: `hsl(${colors.primary})` }}
                      title="Primary"
                    />
                    <div
                      className="h-8 w-8 rounded-full border"
                      style={{ backgroundColor: `hsl(${colors.secondary})` }}
                      title="Secondary"
                    />
                    <div
                      className="h-8 w-8 rounded-full border"
                      style={{ backgroundColor: `hsl(${colors.accent})` }}
                      title="Accent"
                    />
                    <div
                      className="h-8 w-8 rounded-full border"
                      style={{ backgroundColor: `hsl(${colors.muted})` }}
                      title="Muted"
                    />
                  </div>

                  <p className="font-medium text-sm">{info.label}</p>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                </button>
              );
            })}
          </div>

          {savingTheme && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Applying theme...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
