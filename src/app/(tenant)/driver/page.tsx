import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getDriverDashboardData } from "./actions";
import { DriverDashboardView } from "./driver-dashboard-view";
import { DriverHeader } from "./driver-header";
import { TourTrigger } from "@/components/ui/tour-trigger";
import { TOUR_DEFINITIONS } from "@/lib/tours";

export default async function DriverDashboardPage() {
  const session = await requireRole(UserRole.DRIVER);
  const data = await getDriverDashboardData();
  const tour = TOUR_DEFINITIONS.driver_routes;

  return (
    <main className="min-h-screen bg-muted/30">
      <DriverHeader
        userName={session.user.name ?? session.user.email}
        userEmail={session.user.email}
      />
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <DriverDashboardView
          data={data}
          userName={session.user.name?.split(" ")[0] ?? "Driver"}
        />
      </div>
      {tour && (
        <TourTrigger
          tourSlug={tour.slug}
          steps={tour.steps}
          autoStart
        />
      )}
    </main>
  );
}
