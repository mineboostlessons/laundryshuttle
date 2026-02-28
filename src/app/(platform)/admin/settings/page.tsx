import { getPlatformSettings } from "./actions";
import { PlatformThemeSettings } from "./platform-theme-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/ui/change-password-form";

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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Change Password</CardTitle>
          <CardDescription>
            Update your admin account password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
