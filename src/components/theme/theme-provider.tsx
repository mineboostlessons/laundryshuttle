import { getCurrentTenant } from "@/lib/tenant";
import { resolveThemeVariables, resolvePresetName, generateThemeCss, THEME_FONTS } from "@/lib/theme";
import type { ThemeConfig } from "@/types/theme";

export async function ThemeProvider({ children }: { children: React.ReactNode }) {
  const tenant = await getCurrentTenant();

  if (!tenant) {
    return <>{children}</>;
  }

  const preset = resolvePresetName(tenant.themePreset || "clean_luxe");
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
