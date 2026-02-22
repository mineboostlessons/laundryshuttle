import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getAttendantDashboardData } from "./actions";
import { AttendantDashboardView } from "./attendant-dashboard-view";

export default async function AttendantDashboardPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER, UserRole.ATTENDANT);
  const data = await getAttendantDashboardData();

  return <AttendantDashboardView data={data} />;
}
