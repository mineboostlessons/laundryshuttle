import { getPlatformSettings } from "./actions";
import { PlatformThemeSettings } from "./platform-theme-settings";

export default async function PlatformSettingsPage() {
  const settings = await getPlatformSettings();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Configure the admin dashboard theme and branding.
        </p>
      </div>
      <PlatformThemeSettings currentPreset={settings.theme} />
    </div>
  );
}
