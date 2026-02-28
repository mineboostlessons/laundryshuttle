import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getAttendantDashboardData } from "./actions";
import { AttendantDashboardView } from "./attendant-dashboard-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/ui/change-password-form";

export default async function AttendantDashboardPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER, UserRole.ATTENDANT);
  const data = await getAttendantDashboardData();

  return (
    <div>
      <AttendantDashboardView data={data} />
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
