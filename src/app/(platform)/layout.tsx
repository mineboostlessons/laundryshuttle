import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { AdminLayoutShell } from "./admin/admin-layout-shell";
import prisma from "@/lib/prisma";
import { resolvePresetName, resolveThemeVariables, generateThemeCss, THEME_FONTS } from "@/lib/theme";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(UserRole.PLATFORM_ADMIN);

  // Fetch platform settings for theme
  let themeCss = "";
  let fontUrl: string | undefined;

  try {
    const settings = await prisma.platformSettings.findUnique({
      where: { id: "platform" },
    });

    const resolvedPreset = resolvePresetName(settings?.theme ?? "clean_luxe");
    const themeVariables = resolveThemeVariables(resolvedPreset);
    themeCss = generateThemeCss(themeVariables);
    fontUrl = THEME_FONTS[resolvedPreset];
  } catch {
    // If theme loading fails, continue with defaults
  }

  return (
    <>
      {fontUrl && (
        <link rel="stylesheet" href={fontUrl} />
      )}
      {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      <AdminLayoutShell email={session.user.email ?? ""}>
        {children}
      </AdminLayoutShell>
    </>
  );
}
