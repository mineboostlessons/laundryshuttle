import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import {
  getAnalyticsKPIs,
  getRevenueTrend,
  getServiceBreakdown,
  getRevenueByChannel,
  getTopCustomers,
  getCustomerGrowth,
} from "./actions";
import { AnalyticsView } from "./analytics-view";

export default async function AnalyticsPage() {
  await requireRole(UserRole.OWNER);

  const defaultRange = "30d" as const;

  const [kpis, revenueTrend, serviceBreakdown, channelData, topCustomers, customerGrowth] =
    await Promise.all([
      getAnalyticsKPIs(defaultRange),
      getRevenueTrend(defaultRange),
      getServiceBreakdown(defaultRange),
      getRevenueByChannel(defaultRange),
      getTopCustomers(defaultRange),
      getCustomerGrowth(defaultRange),
    ]);

  return (
    <AnalyticsView
      initialRange={defaultRange}
      initialData={{
        kpis,
        revenueTrend,
        serviceBreakdown,
        channelData,
        topCustomers,
        customerGrowth,
      }}
    />
  );
}
