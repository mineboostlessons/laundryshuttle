import { getCurrentTenant } from "@/lib/tenant";
import { resolveThemeVariables, generateThemeCss, THEME_FONTS } from "@/lib/theme";
import type { ThemePreset, ThemeConfig } from "@/types/theme";

export async function ThemeProvider({ children }: { children: React.ReactNode }) {
  const tenant = await getCurrentTenant();

  if (!tenant) {
    return <>{children}</>;
  }

  const preset = (tenant.themePreset || "modern") as ThemePreset;
  const overrides = tenant.themeConfig as ThemeConfig | null;
  const variables = resolveThemeVariables(preset, overrides);
  const css = generateThemeCss(variables, overrides);
  const fontUrl = THEME_FONTS[preset];

  return (
    <>
      {fontUrl && (
        <link rel="stylesheet" href={fontUrl} />
      )}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {children}
    </>
  );
}
