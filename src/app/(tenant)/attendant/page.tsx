import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getAttendantDashboardData } from "./actions";
import { AttendantDashboardView } from "./attendant-dashboard-view";
import { ChangePasswordForm } from "@/components/ui/change-password-form";

export default async function AttendantDashboardPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER, UserRole.ATTENDANT);
  const data = await getAttendantDashboardData();

  return (
    <div>
      <AttendantDashboardView data={data} />
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
