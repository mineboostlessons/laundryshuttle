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
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground">
          Manage email, SMS, and push notification preferences and templates
        </p>
      </div>

      <NotificationSettingsView
        initialSettings={settings}
        initialTemplates={templates}
      />
    </div>
  );
}
