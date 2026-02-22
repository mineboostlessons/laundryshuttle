import type { ThemePreset, ThemeVariables, ThemeConfig } from "@/types/theme";

// =============================================================================
// Theme Presets — 4 complete HSL color palettes
// =============================================================================

export const THEME_PRESETS: Record<ThemePreset, ThemeVariables> = {
  // Modern (blue) — matches globals.css defaults
  modern: {
    background: "0 0% 100%",
    foreground: "222.2 84% 4.9%",
    card: "0 0% 100%",
    "card-foreground": "222.2 84% 4.9%",
    primary: "221.2 83.2% 53.3%",
    "primary-foreground": "210 40% 98%",
    secondary: "210 40% 96.1%",
    "secondary-foreground": "222.2 47.4% 11.2%",
    muted: "210 40% 96.1%",
    "muted-foreground": "215.4 16.3% 46.9%",
    accent: "210 40% 96.1%",
    "accent-foreground": "222.2 47.4% 11.2%",
    destructive: "0 84.2% 60.2%",
    "destructive-foreground": "210 40% 98%",
    border: "214.3 31.8% 91.4%",
    input: "214.3 31.8% 91.4%",
    ring: "221.2 83.2% 53.3%",
  },

  // Classic (emerald) — green/eco feel
  classic: {
    background: "0 0% 100%",
    foreground: "150 30% 6%",
    card: "0 0% 100%",
    "card-foreground": "150 30% 6%",
    primary: "160 84% 39%",
    "primary-foreground": "0 0% 100%",
    secondary: "150 20% 95%",
    "secondary-foreground": "150 30% 15%",
    muted: "150 15% 95%",
    "muted-foreground": "150 10% 45%",
    accent: "150 20% 93%",
    "accent-foreground": "150 30% 15%",
    destructive: "0 84.2% 60.2%",
    "destructive-foreground": "210 40% 98%",
    border: "150 15% 90%",
    input: "150 15% 90%",
    ring: "160 84% 39%",
  },

  // Bold (purple/violet) — premium branding
  bold: {
    background: "0 0% 100%",
    foreground: "270 50% 6%",
    card: "0 0% 100%",
    "card-foreground": "270 50% 6%",
    primary: "262 83% 58%",
    "primary-foreground": "0 0% 100%",
    secondary: "260 20% 95%",
    "secondary-foreground": "270 40% 15%",
    muted: "260 15% 95%",
    "muted-foreground": "260 10% 45%",
    accent: "260 20% 93%",
    "accent-foreground": "270 40% 15%",
    destructive: "0 84.2% 60.2%",
    "destructive-foreground": "210 40% 98%",
    border: "260 15% 90%",
    input: "260 15% 90%",
    ring: "262 83% 58%",
  },

  // Minimal (slate/neutral) — understated
  minimal: {
    background: "0 0% 100%",
    foreground: "220 14% 10%",
    card: "0 0% 100%",
    "card-foreground": "220 14% 10%",
    primary: "220 14% 20%",
    "primary-foreground": "0 0% 100%",
    secondary: "220 10% 96%",
    "secondary-foreground": "220 14% 15%",
    muted: "220 10% 96%",
    "muted-foreground": "220 10% 46%",
    accent: "220 10% 94%",
    "accent-foreground": "220 14% 15%",
    destructive: "0 84.2% 60.2%",
    "destructive-foreground": "210 40% 98%",
    border: "220 10% 91%",
    input: "220 10% 91%",
    ring: "220 14% 20%",
  },
};

/**
 * Merge a theme preset with optional tenant overrides.
 */
export function resolveThemeVariables(
  preset: ThemePreset,
  overrides?: ThemeConfig | null
): ThemeVariables {
  const base = { ...THEME_PRESETS[preset] };

  if (overrides?.primaryColor) {
    base.primary = overrides.primaryColor;
    base.ring = overrides.primaryColor;
  }

  return base;
}

/**
 * Generate a CSS string that overrides :root CSS variables.
 */
export function generateThemeCss(
  variables: ThemeVariables,
  overrides?: ThemeConfig | null
): string {
  const lines = Object.entries(variables)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n");

  let extra = "";
  if (overrides?.borderRadius) {
    extra += `\n  --radius: ${overrides.borderRadius};`;
  }
  if (overrides?.fontFamily) {
    extra += `\n  --font-sans: ${overrides.fontFamily};`;
  }

  let css = `:root {\n${lines}${extra}\n}`;

  if (overrides?.customCss) {
    css += `\n${overrides.customCss}`;
  }

  return css;
}
