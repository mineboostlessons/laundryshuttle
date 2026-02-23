import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { AdminLayoutShell } from "./admin/admin-layout-shell";
import prisma from "@/lib/prisma";
import { resolveThemeVariables, generateThemeCss } from "@/lib/theme";
import type { ThemePreset } from "@/types/theme";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(UserRole.PLATFORM_ADMIN);

  // Fetch platform settings for theme
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "platform" },
  });

  const themePreset = (settings?.theme ?? "modern") as ThemePreset;
  const themeVariables = resolveThemeVariables(themePreset);
  const themeCss = generateThemeCss(themeVariables);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      <AdminLayoutShell email={session.user.email}>
        {children}
      </AdminLayoutShell>
    </>
  );
}
