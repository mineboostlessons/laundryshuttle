import { getCurrentTenant } from "@/lib/tenant";
import { resolveThemeVariables, generateThemeCss } from "@/lib/theme";
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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {children}
    </>
  );
}
