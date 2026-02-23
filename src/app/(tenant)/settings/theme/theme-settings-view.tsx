"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { cn } from "@/lib/utils";
import { THEME_PRESETS, THEME_FONTS } from "@/lib/theme";
import type { ThemePreset } from "@/types/theme";
import { updateTenantTheme, updateTenantLogo } from "./actions";
import { Check, Loader2 } from "lucide-react";

const PRESET_INFO: Record<ThemePreset, { label: string; description: string }> = {
  modern: { label: "Modern", description: "Clean sans-serif, subtle shadows, tech-forward" },
  classic: { label: "Classic", description: "Serif headings, warm tones, traditional elegance" },
  bold: { label: "Bold", description: "Dramatic shadows, statement typography, premium feel" },
  minimal: { label: "Minimal", description: "Flat design, thin type, barely-there borders" },
  warm: { label: "Warm", description: "Rounded, friendly, soft shadows, cozy neighborhood" },
  ocean: { label: "Ocean", description: "Cool-toned, crisp typography, fresh and clean" },
};

interface ThemeSettingsViewProps {
  currentPreset: ThemePreset;
  currentLogoUrl: string | null;
}

function ThemePreviewCard({ preset }: { preset: ThemePreset }) {
  const vars = THEME_PRESETS[preset];
  const fontUrl = THEME_FONTS[preset];

  return (
    <div
      className="overflow-hidden rounded border"
      style={{
        background: `hsl(${vars.background})`,
        fontFamily: vars["font-sans"],
        borderRadius: vars.radius,
      }}
    >
      {fontUrl && <link rel="stylesheet" href={fontUrl} />}
      {/* Mini hero */}
      <div
        className="px-3 py-4"
        style={{ background: vars["hero-gradient"] }}
      >
        <div
          className="text-sm"
          style={{
            fontFamily: vars["font-heading"],
            fontWeight: Number(vars["heading-weight"]),
            letterSpacing: vars["heading-tracking"],
            color: `hsl(${vars.foreground})`,
          }}
        >
          Your Business
        </div>
        <div
          className="mt-1 text-[10px]"
          style={{ color: `hsl(${vars["muted-foreground"]})` }}
        >
          Laundry pickup & delivery
        </div>
      </div>
      {/* Mini card row */}
      <div className="flex gap-1.5 px-3 pb-3 pt-1.5">
        <div
          className="flex-1 p-1.5"
          style={{
            background: `hsl(${vars.card})`,
            border: `1px solid hsl(${vars.border})`,
            borderRadius: vars.radius,
            boxShadow: vars["card-shadow"],
          }}
        >
          <div
            className="h-1 w-6 rounded-full"
            style={{ background: `hsl(${vars.primary})` }}
          />
          <div
            className="mt-1 h-1 w-10 rounded-full"
            style={{ background: `hsl(${vars.muted})` }}
          />
        </div>
        <div
          className="flex-1 p-1.5"
          style={{
            background: `hsl(${vars.card})`,
            border: `1px solid hsl(${vars.border})`,
            borderRadius: vars.radius,
            boxShadow: vars["card-shadow"],
          }}
        >
          <div
            className="h-1 w-5 rounded-full"
            style={{ background: `hsl(${vars.primary})` }}
          />
          <div
            className="mt-1 h-1 w-8 rounded-full"
            style={{ background: `hsl(${vars.muted})` }}
          />
        </div>
      </div>
      {/* Mini button */}
      <div className="px-3 pb-3">
        <div
          className="h-5 w-full"
          style={{
            background: `hsl(${vars.primary})`,
            borderRadius: vars["button-radius"],
          }}
        />
      </div>
    </div>
  );
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
          <CardTitle>Design Theme</CardTitle>
          <CardDescription>
            Choose a theme for your website. Each theme includes unique fonts, shadows, shapes, and colors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((key) => {
              const info = PRESET_INFO[key];
              const isSelected = preset === key;

              return (
                <button
                  key={key}
                  onClick={() => handlePresetChange(key)}
                  disabled={savingTheme}
                  className={cn(
                    "relative rounded-lg border-2 p-3 text-left transition-all hover:shadow-md",
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {isSelected && (
                    <div className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}

                  {/* Mini preview */}
                  <ThemePreviewCard preset={key} />

                  <p className="mt-2 font-medium text-sm">{info.label}</p>
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
