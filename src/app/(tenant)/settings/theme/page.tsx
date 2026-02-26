import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getTenantThemeSettings } from "./actions";
import { ThemeSettingsView } from "./theme-settings-view";

export default async function ThemeSettingsPage() {
  await requireRole(UserRole.OWNER);
  const settings = await getTenantThemeSettings();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Theme Settings</h1>
        <p className="text-muted-foreground">
          Customize your website&apos;s look and feel
        </p>
      </div>

      <ThemeSettingsView
        currentPreset={settings.preset}
        currentLogoUrl={settings.logoUrl}
      />
    </div>
  );
}
