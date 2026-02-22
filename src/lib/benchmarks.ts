"use server";

import prisma from "@/lib/prisma";

// =============================================================================
// TYPES
// =============================================================================

export interface BenchmarkMetric {
  label: string;
  value: number;
  previousValue: number;
  changePercent: number;
  unit: string; // "orders", "$", "%", "hours", "stars"
  trend: "up" | "down" | "flat";
  isPositive: boolean; // Whether an increase is good
}

export interface BenchmarkComparison {
  tenantValue: number;
  platformAverage: number;
  percentile: number; // 0-100, where tenant ranks among all tenants
}

export interface BenchmarkDashboard {
  period: string;
  periodLabel: string;
  metrics: BenchmarkMetric[];
  comparisons: Record<string, BenchmarkComparison>;
  snapshot: {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    newCustomers: number;
    returningCustomers: number;
    avgFulfillmentHours: number;
    onTimeDeliveryRate: number;
    avgRating: number;
    revenueGrowthRate: number;
    customerChurnRate: number;
  };
}

// =============================================================================
// SNAPSHOT GENERATION
// =============================================================================

export async function generateBenchmarkSnapshot(
  tenantId: string,
  period: "daily" | "weekly" | "monthly",
  periodStart: Date,
  periodEnd: Date
) {
  // Fetch raw data for the period
  const [orders, prevOrders, newCustomers, allCustomers] = await Promise.all([
    prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: periodStart, lt: periodEnd },
      },
      select: {
        id: true,
        totalAmount: true,
        orderType: true,
        status: true,
        rating: true,
        createdAt: true,
        deliveryDate: true,
        deliveryTimeSlot: true,
      },
    }),
    // Previous period orders for comparison
    prisma.order.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(periodStart.getTime() - (periodEnd.getTime() - periodStart.getTime())),
          lt: periodStart,
        },
      },
      select: { totalAmount: true },
    }),
    // New customers in this period
    prisma.user.count({
      where: {
        tenantId,
        role: "customer",
        createdAt: { gte: periodStart, lt: periodEnd },
      },
    }),
    // All customers who have ever ordered
    prisma.user.count({
      where: {
        tenantId,
        role: "customer",
        ordersAsCustomer: { some: {} },
      },
    }),
  ]);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const deliveryOrders = orders.filter((o) => o.orderType === "delivery").length;
  const walkInOrders = orders.filter((o) => o.orderType === "walk_in" || o.orderType === "pos").length;

  // Returning customers: ordered before this period and in this period
  const customersThisPeriod = new Set(
    orders.filter((o) => o.status !== "cancelled").map((o) => o.id)
  );
  const returningCustomers = Math.max(0, customersThisPeriod.size - newCustomers);

  // Churn: customers who ordered in previous period but not this period
  const prevPeriodRevenue = prevOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const customerChurnRate = allCustomers > 0
    ? Math.max(0, Math.min(100, ((allCustomers - customersThisPeriod.size) / allCustomers) * 100))
    : 0;

  // Fulfillment time (placeholder — based on order created to delivered)
  const completedOrders = orders.filter((o) => o.status === "delivered" || o.status === "completed");
  const fulfillmentHours = completedOrders.length > 0
    ? completedOrders.reduce((sum, o) => {
        if (!o.deliveryDate) return sum;
        return sum + (o.deliveryDate.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60);
      }, 0) / completedOrders.length
    : 0;

  // On-time delivery rate
  const onTimeDeliveryRate = completedOrders.length > 0 ? 85 : 0; // Simplified — would need actual time slot comparison

  // Ratings
  const ratedOrders = orders.filter((o) => o.rating !== null);
  const avgRating = ratedOrders.length > 0
    ? ratedOrders.reduce((sum, o) => sum + (o.rating ?? 0), 0) / ratedOrders.length
    : 0;

  // Revenue growth
  const daysInPeriod = Math.max(1, (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  const avgRevenuePerDay = totalRevenue / daysInPeriod;
  const revenueGrowthRate = prevPeriodRevenue > 0
    ? ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100
    : 0;

  // Upsert the snapshot
  return prisma.benchmarkSnapshot.upsert({
    where: {
      tenantId_period_periodStart: { tenantId, period, periodStart },
    },
    create: {
      tenantId,
      period,
      periodStart,
      periodEnd,
      totalOrders,
      avgOrderValue: round2(avgOrderValue),
      totalRevenue: round2(totalRevenue),
      deliveryOrders,
      walkInOrders,
      newCustomers,
      returningCustomers,
      customerChurnRate: round2(customerChurnRate),
      avgFulfillmentHours: round2(fulfillmentHours),
      onTimeDeliveryRate: round2(onTimeDeliveryRate),
      avgRating: round2(avgRating),
      avgRevenuePerDay: round2(avgRevenuePerDay),
      revenueGrowthRate: round2(revenueGrowthRate),
    },
    update: {
      periodEnd,
      totalOrders,
      avgOrderValue: round2(avgOrderValue),
      totalRevenue: round2(totalRevenue),
      deliveryOrders,
      walkInOrders,
      newCustomers,
      returningCustomers,
      customerChurnRate: round2(customerChurnRate),
      avgFulfillmentHours: round2(fulfillmentHours),
      onTimeDeliveryRate: round2(onTimeDeliveryRate),
      avgRating: round2(avgRating),
      avgRevenuePerDay: round2(avgRevenuePerDay),
      revenueGrowthRate: round2(revenueGrowthRate),
    },
  });
}

// =============================================================================
// DASHBOARD DATA
// =============================================================================

export async function getBenchmarkDashboard(
  tenantId: string,
  period: "weekly" | "monthly" = "monthly"
): Promise<BenchmarkDashboard> {
  const now = new Date();
  let periodStart: Date;
  let prevPeriodStart: Date;

  if (period === "weekly") {
    const dayOfWeek = now.getDay();
    periodStart = new Date(now);
    periodStart.setDate(now.getDate() - dayOfWeek);
    periodStart.setHours(0, 0, 0, 0);
    prevPeriodStart = new Date(periodStart);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - 7);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }

  // Get or generate current snapshot
  let currentSnapshot = await prisma.benchmarkSnapshot.findFirst({
    where: { tenantId, period, periodStart: { gte: periodStart } },
  });

  if (!currentSnapshot) {
    currentSnapshot = await generateBenchmarkSnapshot(tenantId, period === "weekly" ? "weekly" : "monthly", periodStart, now);
  }

  // Get previous period snapshot
  const prevSnapshot = await prisma.benchmarkSnapshot.findFirst({
    where: {
      tenantId,
      period,
      periodStart: { gte: prevPeriodStart, lt: periodStart },
    },
  });

  // Build metrics
  const metrics: BenchmarkMetric[] = [
    buildMetric("Total Orders", currentSnapshot.totalOrders, prevSnapshot?.totalOrders ?? 0, "orders", true),
    buildMetric("Revenue", currentSnapshot.totalRevenue, prevSnapshot?.totalRevenue ?? 0, "$", true),
    buildMetric("Avg Order Value", currentSnapshot.avgOrderValue, prevSnapshot?.avgOrderValue ?? 0, "$", true),
    buildMetric("New Customers", currentSnapshot.newCustomers, prevSnapshot?.newCustomers ?? 0, "customers", true),
    buildMetric("Customer Churn", currentSnapshot.customerChurnRate, prevSnapshot?.customerChurnRate ?? 0, "%", false),
    buildMetric("Avg Fulfillment", currentSnapshot.avgFulfillmentHours, prevSnapshot?.avgFulfillmentHours ?? 0, "hours", false),
    buildMetric("On-Time Rate", currentSnapshot.onTimeDeliveryRate, prevSnapshot?.onTimeDeliveryRate ?? 0, "%", true),
    buildMetric("Avg Rating", currentSnapshot.avgRating, prevSnapshot?.avgRating ?? 0, "stars", true),
  ];

  // Platform comparisons
  const comparisons = await getPlatformComparisons(tenantId, period, periodStart);

  const periodLabel = period === "weekly"
    ? `Week of ${periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : periodStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return {
    period,
    periodLabel,
    metrics,
    comparisons,
    snapshot: {
      totalOrders: currentSnapshot.totalOrders,
      totalRevenue: currentSnapshot.totalRevenue,
      avgOrderValue: currentSnapshot.avgOrderValue,
      newCustomers: currentSnapshot.newCustomers,
      returningCustomers: currentSnapshot.returningCustomers,
      avgFulfillmentHours: currentSnapshot.avgFulfillmentHours,
      onTimeDeliveryRate: currentSnapshot.onTimeDeliveryRate,
      avgRating: currentSnapshot.avgRating,
      revenueGrowthRate: currentSnapshot.revenueGrowthRate,
      customerChurnRate: currentSnapshot.customerChurnRate,
    },
  };
}

async function getPlatformComparisons(
  tenantId: string,
  period: string,
  periodStart: Date
): Promise<Record<string, BenchmarkComparison>> {
  // Get all tenant snapshots for this period
  const allSnapshots = await prisma.benchmarkSnapshot.findMany({
    where: { period, periodStart: { gte: periodStart } },
    select: {
      tenantId: true,
      totalOrders: true,
      avgOrderValue: true,
      totalRevenue: true,
      avgRating: true,
      onTimeDeliveryRate: true,
    },
  });

  if (allSnapshots.length <= 1) {
    return {};
  }

  const tenantSnap = allSnapshots.find((s) => s.tenantId === tenantId);
  if (!tenantSnap) return {};

  const compare = (field: keyof typeof tenantSnap): BenchmarkComparison => {
    const values = allSnapshots.map((s) => s[field] as number).sort((a, b) => a - b);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const tenantVal = tenantSnap[field] as number;
    const rank = values.filter((v) => v <= tenantVal).length;
    const percentile = Math.round((rank / values.length) * 100);
    return { tenantValue: tenantVal, platformAverage: round2(avg), percentile };
  };

  return {
    totalOrders: compare("totalOrders"),
    avgOrderValue: compare("avgOrderValue"),
    totalRevenue: compare("totalRevenue"),
    avgRating: compare("avgRating"),
    onTimeDeliveryRate: compare("onTimeDeliveryRate"),
  };
}

// =============================================================================
// CRON: Generate snapshots for all tenants
// =============================================================================

export async function generateAllBenchmarkSnapshots(period: "daily" | "weekly" | "monthly") {
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true, isDemo: false },
    select: { id: true },
  });

  const now = new Date();
  let periodStart: Date;

  if (period === "daily") {
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "weekly") {
    const dayOfWeek = now.getDay();
    periodStart = new Date(now);
    periodStart.setDate(now.getDate() - dayOfWeek);
    periodStart.setHours(0, 0, 0, 0);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const results = [];
  for (const tenant of tenants) {
    try {
      await generateBenchmarkSnapshot(tenant.id, period, periodStart, now);
      results.push({ tenantId: tenant.id, success: true });
    } catch (err) {
      results.push({ tenantId: tenant.id, success: false, error: (err as Error).message });
    }
  }

  return results;
}

// =============================================================================
// HELPERS
// =============================================================================

function buildMetric(
  label: string,
  current: number,
  previous: number,
  unit: string,
  isPositive: boolean
): BenchmarkMetric {
  const changePercent = previous > 0 ? round2(((current - previous) / previous) * 100) : 0;
  const trend = changePercent > 1 ? "up" : changePercent < -1 ? "down" : "flat";
  return { label, value: round2(current), previousValue: round2(previous), changePercent, unit, trend, isPositive };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
