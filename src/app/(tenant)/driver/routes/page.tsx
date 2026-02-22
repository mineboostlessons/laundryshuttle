import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getDriverRouteHistory } from "../actions";
import { RouteHistoryView } from "./route-history-view";
import { DriverHeader } from "../driver-header";

export default async function DriverRoutesPage() {
  const session = await requireRole(UserRole.DRIVER);
  const data = await getDriverRouteHistory();

  return (
    <main className="min-h-screen bg-muted/30">
      <DriverHeader
        userName={session.user.name ?? session.user.email}
        userEmail={session.user.email}
      />
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <h2 className="text-xl font-bold mb-4">Route History</h2>
        <RouteHistoryView data={data} />
      </div>
    </main>
  );
}
