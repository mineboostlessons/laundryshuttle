// =============================================================================
// Theme System — Type Definitions
// =============================================================================

export type ThemePreset = "modern" | "classic" | "bold" | "minimal" | "warm" | "ocean";

/** All CSS variable keys used by the theme system */
export interface ThemeVariables {
  background: string;
  foreground: string;
  card: string;
  "card-foreground": string;
  primary: string;
  "primary-foreground": string;
  secondary: string;
  "secondary-foreground": string;
  muted: string;
  "muted-foreground": string;
  accent: string;
  "accent-foreground": string;
  destructive: string;
  "destructive-foreground": string;
  border: string;
  input: string;
  ring: string;
  // Design tokens
  radius: string;
  "font-sans": string;
  "font-heading": string;
  "heading-weight": string;
  "heading-tracking": string;
  "shadow-sm": string;
  "shadow-md": string;
  "shadow-lg": string;
  "card-shadow": string;
  "hero-gradient": string;
  "section-gap": string;
  "button-radius": string;
}

/** Tenant-level theme overrides stored in Tenant.themeConfig JSON */
export interface ThemeConfig {
  primaryColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  borderRadius?: string;
  customCss?: string;
}

export const THEME_VARIABLE_KEYS: (keyof ThemeVariables)[] = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
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
];
