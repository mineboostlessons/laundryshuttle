import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getNotificationSettings, getNotificationTemplates } from "./actions";
import { NotificationSettingsView } from "./notification-settings-view";

export default async function NotificationSettingsPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);

  const [settings, templates] = await Promise.all([
    getNotificationSettings(),
    getNotificationTemplates(),
  ]);

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-xl font-bold">Notification Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage email, SMS, and push notification preferences and templates
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-5xl p-6">
        <NotificationSettingsView
          initialSettings={settings}
          initialTemplates={templates}
        />
      </div>
    </main>
  );
}
