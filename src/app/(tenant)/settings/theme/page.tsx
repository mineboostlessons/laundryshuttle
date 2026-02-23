import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getTenantThemeSettings } from "./actions";
import { ThemeSettingsView } from "./theme-settings-view";

export default async function ThemeSettingsPage() {
  await requireRole(UserRole.OWNER);
  const settings = await getTenantThemeSettings();

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-xl font-bold">Theme Settings</h1>
          <p className="text-sm text-muted-foreground">
            Customize your website&apos;s look and feel
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-3xl p-6">
        <ThemeSettingsView
          currentPreset={settings.preset}
          currentLogoUrl={settings.logoUrl}
        />
      </div>
    </main>
  );
}
