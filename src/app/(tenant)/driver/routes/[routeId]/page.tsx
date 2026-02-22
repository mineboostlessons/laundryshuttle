import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getRouteDetail } from "../../actions";
import { RouteDetailView } from "./route-detail-view";
import { DriverHeader } from "../../driver-header";
import { redirect } from "next/navigation";

interface RouteDetailPageProps {
  params: Promise<{ routeId: string }>;
}

export default async function RouteDetailPage({ params }: RouteDetailPageProps) {
  const { routeId } = await params;
  const session = await requireRole(UserRole.DRIVER);
  const result = await getRouteDetail(routeId);

  if (!result.success || !result.route) {
    redirect("/driver");
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <DriverHeader
        userName={session.user.name ?? session.user.email}
        userEmail={session.user.email}
      />
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <RouteDetailView route={result.route} />
      </div>
    </main>
  );
}
