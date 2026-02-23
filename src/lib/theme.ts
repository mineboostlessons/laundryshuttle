import type { ThemePreset, LegacyThemePreset, ThemeVariables, ThemeConfig } from "@/types/theme";

// =============================================================================
// Legacy theme name mapping — fallback for existing tenants
// =============================================================================

const LEGACY_THEME_MAP: Record<LegacyThemePreset, ThemePreset> = {
  modern: "clean_luxe",
  classic: "eco_zen",
  bold: "neon_express",
  minimal: "metro_editorial",
  warm: "soft_cloud",
  ocean: "fresh_wave",
};

/** Resolve a theme preset name, mapping legacy names to new ones */
export function resolvePresetName(preset: string): ThemePreset {
  if (preset in LEGACY_THEME_MAP) {
    return LEGACY_THEME_MAP[preset as LegacyThemePreset];
  }
  if (preset in THEME_PRESETS) {
    return preset as ThemePreset;
  }
  return "clean_luxe";
}

// =============================================================================
// Theme Presets — 6 premium design systems
// =============================================================================

export const THEME_PRESETS: Record<ThemePreset, ThemeVariables> = {
  // Clean Luxe — Premium, sophisticated (Navy + Gold on Ivory)
  clean_luxe: {
    background: "40 24% 92%",        // #F0EDE5 ivory
    foreground: "210 46% 11%",       // #0D1B2A navy
    card: "0 0% 100%",
    "card-foreground": "210 46% 11%",
    primary: "210 46% 11%",          // #0D1B2A navy
    "primary-foreground": "40 24% 92%",
    secondary: "40 20% 88%",
    "secondary-foreground": "210 46% 11%",
    muted: "40 15% 90%",
    "muted-foreground": "210 10% 45%",
    accent: "38 40% 61%",           // #C9A96E gold
    "accent-foreground": "210 46% 11%",
    destructive: "0 84% 60%",
    "destructive-foreground": "0 0% 100%",
    border: "40 15% 85%",
    input: "40 15% 85%",
    ring: "38 40% 61%",
    radius: "0.5rem",
    "font-sans": "'DM Sans', system-ui, sans-serif",
    "font-heading": "'Playfair Display', Georgia, serif",
    "heading-weight": "700",
    "heading-tracking": "-0.02em",
    "shadow-sm": "0 1px 2px rgba(13, 27, 42, 0.06)",
    "shadow-md": "0 4px 12px rgba(13, 27, 42, 0.08)",
    "shadow-lg": "0 12px 32px rgba(13, 27, 42, 0.12)",
    "card-shadow": "0 1px 4px rgba(13, 27, 42, 0.05)",
    "hero-gradient": "linear-gradient(160deg, hsl(210 46% 11%) 0%, hsl(210 40% 18%) 100%)",
    "section-gap": "5rem",
    "button-radius": "0.5rem",
  },

  // Fresh Wave — Modern, approachable (Blue + Mint on Cloud)
  fresh_wave: {
    background: "224 60% 98%",       // #F8FAFF cloud
    foreground: "220 50% 10%",
    card: "0 0% 100%",
    "card-foreground": "220 50% 10%",
    primary: "220 100% 50%",         // #0066FF blue
    "primary-foreground": "0 0% 100%",
    secondary: "224 40% 95%",
    "secondary-foreground": "220 50% 15%",
    muted: "224 30% 94%",
    "muted-foreground": "220 15% 46%",
    accent: "165 100% 42%",          // #00D4AA mint
    "accent-foreground": "220 50% 10%",
    destructive: "0 84% 60%",
    "destructive-foreground": "0 0% 100%",
    border: "224 25% 90%",
    input: "224 25% 90%",
    ring: "220 100% 50%",
    radius: "0.75rem",
    "font-sans": "'Plus Jakarta Sans', system-ui, sans-serif",
    "font-heading": "'Plus Jakarta Sans', system-ui, sans-serif",
    "heading-weight": "700",
    "heading-tracking": "-0.025em",
    "shadow-sm": "0 1px 3px rgba(0, 102, 255, 0.06)",
    "shadow-md": "0 4px 12px rgba(0, 102, 255, 0.08)",
    "shadow-lg": "0 12px 32px rgba(0, 102, 255, 0.12)",
    "card-shadow": "0 1px 4px rgba(0, 102, 255, 0.04)",
    "hero-gradient": "linear-gradient(135deg, hsl(220 100% 50% / 0.06) 0%, hsl(224 60% 98%) 50%, hsl(165 100% 42% / 0.05) 100%)",
    "section-gap": "4rem",
    "button-radius": "0.75rem",
  },

  // Eco Zen — Natural, calm (Forest + Sage on Linen)
  eco_zen: {
    background: "36 33% 95%",        // #FAF7F0 linen
    foreground: "160 26% 24%",       // #2D4A3E forest
    card: "0 0% 100%",
    "card-foreground": "160 26% 24%",
    primary: "160 26% 24%",          // #2D4A3E forest
    "primary-foreground": "36 33% 95%",
    secondary: "80 15% 92%",
    "secondary-foreground": "160 26% 20%",
    muted: "80 12% 93%",
    "muted-foreground": "160 10% 45%",
    accent: "135 25% 65%",           // #8FB996 sage
    "accent-foreground": "160 26% 15%",
    destructive: "0 84% 60%",
    "destructive-foreground": "0 0% 100%",
    border: "80 12% 87%",
    input: "80 12% 87%",
    ring: "135 25% 65%",
    radius: "0.625rem",
    "font-sans": "'Outfit', system-ui, sans-serif",
    "font-heading": "'Fraunces', Georgia, serif",
    "heading-weight": "600",
    "heading-tracking": "0em",
    "shadow-sm": "0 1px 3px rgba(45, 74, 62, 0.06)",
    "shadow-md": "0 4px 12px rgba(45, 74, 62, 0.08)",
    "shadow-lg": "0 12px 24px rgba(45, 74, 62, 0.1)",
    "card-shadow": "0 1px 4px rgba(45, 74, 62, 0.04)",
    "hero-gradient": "linear-gradient(160deg, hsl(160 26% 24% / 0.06) 0%, hsl(36 33% 95%) 50%, hsl(135 25% 65% / 0.05) 100%)",
    "section-gap": "4.5rem",
    "button-radius": "0.625rem",
  },

  // Neon Express — Dark-mode, energetic (Violet + Cyan on Black)
  neon_express: {
    background: "0 0% 4%",           // #0A0A0A near-black
    foreground: "0 0% 95%",
    card: "0 0% 8%",
    "card-foreground": "0 0% 95%",
    primary: "264 93% 58%",          // #7B2FF7 violet
    "primary-foreground": "0 0% 100%",
    secondary: "264 20% 15%",
    "secondary-foreground": "0 0% 90%",
    muted: "0 0% 12%",
    "muted-foreground": "0 0% 55%",
    accent: "185 100% 50%",          // #00F0FF cyan
    "accent-foreground": "0 0% 4%",
    destructive: "0 84% 60%",
    "destructive-foreground": "0 0% 100%",
    border: "0 0% 16%",
    input: "0 0% 16%",
    ring: "185 100% 50%",
    radius: "0.5rem",
    "font-sans": "'Manrope', system-ui, sans-serif",
    "font-heading": "'Space Grotesk', system-ui, sans-serif",
    "heading-weight": "700",
    "heading-tracking": "-0.03em",
    "shadow-sm": "0 1px 3px rgba(123, 47, 247, 0.15)",
    "shadow-md": "0 4px 16px rgba(123, 47, 247, 0.2)",
    "shadow-lg": "0 12px 40px rgba(123, 47, 247, 0.25)",
    "card-shadow": "0 1px 4px rgba(0, 240, 255, 0.06)",
    "hero-gradient": "radial-gradient(ellipse at 30% 50%, hsl(264 93% 58% / 0.15) 0%, hsl(0 0% 4%) 70%)",
    "section-gap": "4rem",
    "button-radius": "0.5rem",
  },

  // Soft Cloud — Rounded, friendly (Lavender + Yellow on Cream)
  soft_cloud: {
    background: "20 100% 97%",       // #FFF5EE cream
    foreground: "240 10% 20%",
    card: "0 0% 100%",
    "card-foreground": "240 10% 20%",
    primary: "244 58% 60%",          // #6C63FF lavender
    "primary-foreground": "0 0% 100%",
    secondary: "244 30% 95%",
    "secondary-foreground": "244 30% 20%",
    muted: "20 20% 94%",
    "muted-foreground": "240 8% 46%",
    accent: "48 100% 62%",           // #FFD93D yellow
    "accent-foreground": "240 10% 15%",
    destructive: "0 84% 60%",
    "destructive-foreground": "0 0% 100%",
    border: "20 15% 89%",
    input: "20 15% 89%",
    ring: "244 58% 60%",
    radius: "1.25rem",
    "font-sans": "'Nunito', system-ui, sans-serif",
    "font-heading": "'Quicksand', system-ui, sans-serif",
    "heading-weight": "700",
    "heading-tracking": "-0.01em",
    "shadow-sm": "0 2px 4px rgba(108, 99, 255, 0.06)",
    "shadow-md": "0 6px 16px rgba(108, 99, 255, 0.1)",
    "shadow-lg": "0 12px 32px rgba(108, 99, 255, 0.14)",
    "card-shadow": "0 2px 8px rgba(108, 99, 255, 0.05)",
    "hero-gradient": "linear-gradient(145deg, hsl(244 58% 60% / 0.08) 0%, hsl(20 100% 97%) 50%, hsl(48 100% 62% / 0.06) 100%)",
    "section-gap": "4rem",
    "button-radius": "9999px",
  },

  // Metro Editorial — Bold typography, editorial (Black + Red on White)
  metro_editorial: {
    background: "0 0% 100%",
    foreground: "0 0% 0%",
    card: "0 0% 100%",
    "card-foreground": "0 0% 0%",
    primary: "0 0% 0%",             // black
    "primary-foreground": "0 0% 100%",
    secondary: "0 0% 96%",
    "secondary-foreground": "0 0% 10%",
    muted: "0 0% 96%",
    "muted-foreground": "0 0% 45%",
    accent: "16 100% 50%",          // #FF4500 red-orange
    "accent-foreground": "0 0% 100%",
    destructive: "0 84% 60%",
    "destructive-foreground": "0 0% 100%",
    border: "0 0% 90%",
    input: "0 0% 90%",
    ring: "0 0% 0%",
    radius: "0.25rem",
    "font-sans": "'Source Sans 3', system-ui, sans-serif",
    "font-heading": "'Libre Baskerville', Georgia, serif",
    "heading-weight": "700",
    "heading-tracking": "-0.02em",
    "shadow-sm": "0 0 0 transparent",
    "shadow-md": "0 1px 2px rgba(0, 0, 0, 0.06)",
    "shadow-lg": "0 2px 8px rgba(0, 0, 0, 0.1)",
    "card-shadow": "0 0 0 transparent",
    "hero-gradient": "linear-gradient(180deg, hsl(0 0% 96%) 0%, hsl(0 0% 100%) 100%)",
    "section-gap": "3.5rem",
    "button-radius": "0.25rem",
  },
};

// =============================================================================
// Google Fonts URLs per preset
// =============================================================================

export const THEME_FONTS: Record<ThemePreset, string> = {
  clean_luxe:
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap",
  fresh_wave:
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
  eco_zen:
    "https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap",
  neon_express:
    "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600&display=swap",
  soft_cloud:
    "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap",
  metro_editorial:
    "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;500;600&display=swap",
};

/**
 * Merge a theme preset with optional tenant overrides.
 */
export function resolveThemeVariables(
  preset: ThemePreset | string,
  overrides?: ThemeConfig | null
): ThemeVariables {
  const resolvedPreset = resolvePresetName(preset);
  const base = { ...THEME_PRESETS[resolvedPreset] };

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
