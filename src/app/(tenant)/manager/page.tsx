import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getManagerDashboardStats } from "./actions";
import { ManagerDashboardView } from "./manager-dashboard-view";

export default async function ManagerDashboardPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const stats = await getManagerDashboardStats();

  return <ManagerDashboardView stats={stats} />;
}
