import type { ThemePreset, ThemeVariables, ThemeConfig } from "@/types/theme";

// =============================================================================
// Theme Presets — 6 complete design systems
// =============================================================================

export const THEME_PRESETS: Record<ThemePreset, ThemeVariables> = {
  // Modern (blue) — Clean tech SaaS
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
    radius: "0.5rem",
    "font-sans": "'Inter', system-ui, sans-serif",
    "font-heading": "'Inter', system-ui, sans-serif",
    "heading-weight": "700",
    "heading-tracking": "-0.025em",
    "shadow-sm": "0 1px 2px rgba(0, 0, 0, 0.05)",
    "shadow-md": "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
    "shadow-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
    "card-shadow": "0 1px 3px rgba(0, 0, 0, 0.04)",
    "hero-gradient": "radial-gradient(ellipse at 30% 50%, hsl(221.2 83.2% 53.3% / 0.08) 0%, hsl(0 0% 100%) 70%)",
    "section-gap": "4rem",
    "button-radius": "0.5rem",
  },

  // Classic (emerald) — Established, trustworthy
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
    radius: "0.375rem",
    "font-sans": "'Source Sans 3', system-ui, sans-serif",
    "font-heading": "'Lora', Georgia, serif",
    "heading-weight": "700",
    "heading-tracking": "0em",
    "shadow-sm": "0 1px 3px rgba(60, 50, 40, 0.08)",
    "shadow-md": "0 4px 12px rgba(60, 50, 40, 0.1)",
    "shadow-lg": "0 8px 24px rgba(60, 50, 40, 0.12)",
    "card-shadow": "0 1px 4px rgba(60, 50, 40, 0.06)",
    "hero-gradient": "linear-gradient(160deg, hsl(160 84% 39% / 0.08) 0%, hsl(0 0% 100%) 50%, hsl(150 20% 93% / 0.05) 100%)",
    "section-gap": "4rem",
    "button-radius": "0.375rem",
  },

  // Bold (purple/violet) — Premium, statement
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
    radius: "0.75rem",
    "font-sans": "'DM Sans', system-ui, sans-serif",
    "font-heading": "'Space Grotesk', system-ui, sans-serif",
    "heading-weight": "700",
    "heading-tracking": "-0.03em",
    "shadow-sm": "0 2px 4px rgba(80, 30, 120, 0.08)",
    "shadow-md": "0 6px 16px rgba(80, 30, 120, 0.12)",
    "shadow-lg": "0 12px 32px rgba(80, 30, 120, 0.16)",
    "card-shadow": "0 2px 8px rgba(80, 30, 120, 0.06)",
    "hero-gradient": "linear-gradient(135deg, hsl(262 83% 58% / 0.1) 0%, hsl(0 0% 100%) 40%, hsl(260 20% 93% / 0.08) 100%)",
    "section-gap": "5rem",
    "button-radius": "0.75rem",
  },

  // Minimal (slate/neutral) — Understated elegance
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
    radius: "0.125rem",
    "font-sans": "'Outfit', system-ui, sans-serif",
    "font-heading": "'Outfit', system-ui, sans-serif",
    "heading-weight": "600",
    "heading-tracking": "-0.01em",
    "shadow-sm": "0 0 0 transparent",
    "shadow-md": "0 1px 2px rgba(0, 0, 0, 0.04)",
    "shadow-lg": "0 2px 4px rgba(0, 0, 0, 0.06)",
    "card-shadow": "0 0 0 transparent",
    "hero-gradient": "linear-gradient(180deg, hsl(220 10% 96%) 0%, hsl(0 0% 100%) 100%)",
    "section-gap": "3.5rem",
    "button-radius": "0.125rem",
  },

  // Warm (orange/amber) — Friendly neighborhood
  warm: {
    background: "0 0% 100%",
    foreground: "20 30% 8%",
    card: "0 0% 100%",
    "card-foreground": "20 30% 8%",
    primary: "25 95% 53%",
    "primary-foreground": "0 0% 100%",
    secondary: "30 30% 96%",
    "secondary-foreground": "20 30% 15%",
    muted: "30 20% 96%",
    "muted-foreground": "20 10% 45%",
    accent: "35 30% 93%",
    "accent-foreground": "20 30% 15%",
    destructive: "0 84.2% 60.2%",
    "destructive-foreground": "210 40% 98%",
    border: "30 15% 90%",
    input: "30 15% 90%",
    ring: "25 95% 53%",
    radius: "1rem",
    "font-sans": "'Nunito', system-ui, sans-serif",
    "font-heading": "'Nunito', system-ui, sans-serif",
    "heading-weight": "800",
    "heading-tracking": "-0.015em",
    "shadow-sm": "0 1px 3px rgba(180, 120, 60, 0.08)",
    "shadow-md": "0 4px 12px rgba(180, 120, 60, 0.1)",
    "shadow-lg": "0 8px 24px rgba(180, 120, 60, 0.14)",
    "card-shadow": "0 2px 6px rgba(180, 120, 60, 0.06)",
    "hero-gradient": "linear-gradient(145deg, hsl(35 95% 60% / 0.1) 0%, hsl(0 0% 100%) 50%, hsl(25 95% 53% / 0.06) 100%)",
    "section-gap": "4rem",
    "button-radius": "9999px",
  },

  // Ocean (teal/cyan) — Fresh, spa-like
  ocean: {
    background: "0 0% 100%",
    foreground: "185 30% 8%",
    card: "0 0% 100%",
    "card-foreground": "185 30% 8%",
    primary: "185 72% 40%",
    "primary-foreground": "0 0% 100%",
    secondary: "185 20% 96%",
    "secondary-foreground": "185 30% 15%",
    muted: "185 15% 96%",
    "muted-foreground": "185 10% 45%",
    accent: "185 20% 93%",
    "accent-foreground": "185 30% 15%",
    destructive: "0 84.2% 60.2%",
    "destructive-foreground": "210 40% 98%",
    border: "185 15% 90%",
    input: "185 15% 90%",
    ring: "185 72% 40%",
    radius: "0.625rem",
    "font-sans": "'Plus Jakarta Sans', system-ui, sans-serif",
    "font-heading": "'Plus Jakarta Sans', system-ui, sans-serif",
    "heading-weight": "700",
    "heading-tracking": "-0.02em",
    "shadow-sm": "0 1px 3px rgba(30, 80, 100, 0.06)",
    "shadow-md": "0 4px 12px rgba(30, 80, 100, 0.09)",
    "shadow-lg": "0 10px 24px rgba(30, 80, 100, 0.12)",
    "card-shadow": "0 1px 4px rgba(30, 80, 100, 0.05)",
    "hero-gradient": "linear-gradient(135deg, hsl(185 72% 40% / 0.06) 0%, hsl(0 0% 100%) 45%, hsl(195 70% 50% / 0.05) 100%)",
    "section-gap": "4rem",
    "button-radius": "0.625rem",
  },
};

// =============================================================================
// Google Fonts URLs per preset
// =============================================================================

export const THEME_FONTS: Record<ThemePreset, string | null> = {
  modern: null, // uses system fonts
  classic:
    "https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Source+Sans+3:wght@400;500;600&display=swap",
  bold: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600&display=swap",
  minimal:
    "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap",
  warm: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap",
  ocean:
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
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

/** CSS variable keys that should NOT be wrapped in hsl() */
const RAW_CSS_VARS = new Set([
  "radius",
  "font-sans",
  "font-heading",
  "heading-weight",
  "heading-tracking",
  "shadow-sm",
  "shadow-md",
  "shadow-lg",
  "card-shadow",
  "hero-gradient",
  "section-gap",
  "button-radius",
]);

/**
 * Generate a CSS string that overrides :root CSS variables
 * plus component-level styles driven by theme tokens.
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

  // Component-level styles driven by theme tokens
  css += `
h1, h2, h3 {
  font-family: var(--font-heading);
  font-weight: var(--heading-weight);
  letter-spacing: var(--heading-tracking);
}
`;

  if (overrides?.customCss) {
    css += `\n${overrides.customCss}`;
  }

  return css;
}
