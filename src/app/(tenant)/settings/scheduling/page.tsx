import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getSchedulingSettings } from "./actions";
import { SchedulingSettingsForm } from "./scheduling-settings-form";

export default async function SchedulingSettingsPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);

  const settings = await getSchedulingSettings();

  if (!settings) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-bold">Scheduling</h1>
        <p className="mt-2 text-muted-foreground">
          No active location found. Please set up a location first.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scheduling</h1>
        <p className="text-muted-foreground">
          Configure pickup scheduling and same-day options
        </p>
      </div>

      <SchedulingSettingsForm settings={settings} />
    </div>
  );
}
