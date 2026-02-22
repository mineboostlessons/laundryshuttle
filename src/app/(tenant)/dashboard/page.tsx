import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import prisma from "@/lib/prisma";
import { getOwnerDashboardStats, getRevenueChartData } from "./actions";
import { OwnerDashboardView } from "./owner-dashboard-view";
import { TourTrigger } from "@/components/ui/tour-trigger";
import { SandboxBanner } from "@/components/ui/sandbox-banner";
import { TOUR_DEFINITIONS } from "@/lib/tours";

export default async function OwnerDashboardPage() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const [stats, chartData, fullTenant] = await Promise.all([
    getOwnerDashboardStats(),
    getRevenueChartData(),
    prisma.tenant.findUnique({
      where: { id: tenant.id },
      select: { isSandbox: true, sandboxExpiresAt: true, businessName: true },
    }),
  ]);

  const tour = TOUR_DEFINITIONS.owner_dashboard;

  return (
    <>
      {fullTenant?.isSandbox && (
        <SandboxBanner
          businessName={fullTenant.businessName}
          expiresAt={fullTenant.sandboxExpiresAt?.toISOString() ?? null}
        />
      )}
      <OwnerDashboardView stats={stats} chartData={chartData} />
      {tour && (
        <TourTrigger
          tourSlug={tour.slug}
          steps={tour.steps}
          autoStart
        />
      )}
    </>
  );
}
