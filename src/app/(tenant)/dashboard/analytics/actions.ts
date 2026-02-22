"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";

export type DateRange = "7d" | "30d" | "90d" | "12m";

function getDateRangeStart(range: DateRange): Date {
  const now = new Date();
  switch (range) {
    case "7d":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    case "30d":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    case "90d":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
    case "12m":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
}

function getPriorPeriodStart(range: DateRange): Date {
  const start = getDateRangeStart(range);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  return new Date(start.getTime() - diff);
}

// =============================================================================
// KPI Stats with Period Comparison
// =============================================================================

export async function getAnalyticsKPIs(range: DateRange) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const periodStart = getDateRangeStart(range);
  const priorStart = getPriorPeriodStart(range);

  const baseWhere = {
    tenantId: tenant.id,
    paidAt: { not: null } as const,
    status: { notIn: ["refunded", "cancelled"] as string[] },
  };

  const [currentRevenue, priorRevenue, currentOrders, priorOrders, currentCustomers, priorCustomers, activeSubscriptions] =
    await Promise.all([
      prisma.order.aggregate({
        where: { ...baseWhere, createdAt: { gte: periodStart } },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { ...baseWhere, createdAt: { gte: priorStart, lt: periodStart } },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({
        where: { tenantId: tenant.id, createdAt: { gte: periodStart } },
      }),
      prisma.order.count({
        where: { tenantId: tenant.id, createdAt: { gte: priorStart, lt: periodStart } },
      }),
      prisma.user.count({
        where: {
          tenantId: tenant.id,
          role: "customer",
          createdAt: { gte: periodStart },
        },
      }),
      prisma.user.count({
        where: {
          tenantId: tenant.id,
          role: "customer",
          createdAt: { gte: priorStart, lt: periodStart },
        },
      }),
      prisma.customerSubscription.count({
        where: {
          plan: { tenantId: tenant.id },
          status: "active",
        },
      }),
    ]);

  const curRev = currentRevenue._sum.totalAmount ?? 0;
  const priRev = priorRevenue._sum.totalAmount ?? 0;
  const aov = currentOrders > 0 ? curRev / currentOrders : 0;
  const priorAov = priorOrders > 0 ? (priRev / priorOrders) : 0;

  function pctChange(current: number, prior: number): number {
    if (prior === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prior) / prior) * 100);
  }

  return {
    revenue: { value: curRev, change: pctChange(curRev, priRev) },
    orders: { value: currentOrders, change: pctChange(currentOrders, priorOrders) },
    newCustomers: { value: currentCustomers, change: pctChange(currentCustomers, priorCustomers) },
    avgOrderValue: { value: Math.round(aov * 100) / 100, change: pctChange(aov, priorAov) },
    activeSubscriptions,
  };
}

// =============================================================================
// Revenue Trend Chart
// =============================================================================

export async function getRevenueTrend(range: DateRange) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const periodStart = getDateRangeStart(range);

  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      paidAt: { not: null },
      createdAt: { gte: periodStart },
      status: { notIn: ["refunded", "cancelled"] },
    },
    select: { totalAmount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by day or month depending on range
  const useMonths = range === "12m";
  const buckets: Record<string, { revenue: number; orders: number }> = {};

  if (useMonths) {
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[key] = { revenue: 0, orders: 0 };
    }
  } else {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets[d.toISOString().split("T")[0]] = { revenue: 0, orders: 0 };
    }
  }

  for (const order of orders) {
    const key = useMonths
      ? `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, "0")}`
      : order.createdAt.toISOString().split("T")[0];
    if (key in buckets) {
      buckets[key].revenue += order.totalAmount;
      buckets[key].orders += 1;
    }
  }

  return Object.entries(buckets).map(([date, data]) => ({
    date,
    revenue: Math.round(data.revenue * 100) / 100,
    orders: data.orders,
  }));
}

// =============================================================================
// Service Breakdown
// =============================================================================

export async function getServiceBreakdown(range: DateRange) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const periodStart = getDateRangeStart(range);

  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        tenantId: tenant.id,
        createdAt: { gte: periodStart },
        status: { notIn: ["refunded", "cancelled"] },
      },
      itemType: "service",
    },
    select: { name: true, totalPrice: true, quantity: true },
  });

  const breakdown: Record<string, { revenue: number; count: number }> = {};
  for (const item of items) {
    if (!breakdown[item.name]) {
      breakdown[item.name] = { revenue: 0, count: 0 };
    }
    breakdown[item.name].revenue += item.totalPrice;
    breakdown[item.name].count += item.quantity;
  }

  return Object.entries(breakdown)
    .map(([name, data]) => ({
      name,
      revenue: Math.round(data.revenue * 100) / 100,
      count: Math.round(data.count),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

// =============================================================================
// Revenue by Channel (delivery vs walk_in vs pos)
// =============================================================================

export async function getRevenueByChannel(range: DateRange) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const periodStart = getDateRangeStart(range);

  const orders = await prisma.order.groupBy({
    by: ["orderType"],
    where: {
      tenantId: tenant.id,
      paidAt: { not: null },
      createdAt: { gte: periodStart },
      status: { notIn: ["refunded", "cancelled"] },
    },
    _sum: { totalAmount: true },
    _count: true,
  });

  const channelLabels: Record<string, string> = {
    delivery: "Delivery",
    walk_in: "Walk-in",
    pos: "POS",
  };

  return orders.map((o) => ({
    channel: channelLabels[o.orderType] ?? o.orderType,
    revenue: Math.round((o._sum.totalAmount ?? 0) * 100) / 100,
    orders: o._count,
  }));
}

// =============================================================================
// Top Customers
// =============================================================================

export async function getTopCustomers(range: DateRange) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const periodStart = getDateRangeStart(range);

  const customers = await prisma.order.groupBy({
    by: ["customerId"],
    where: {
      tenantId: tenant.id,
      paidAt: { not: null },
      createdAt: { gte: periodStart },
      status: { notIn: ["refunded", "cancelled"] },
      customerId: { not: null },
    },
    _sum: { totalAmount: true },
    _count: true,
    orderBy: { _sum: { totalAmount: "desc" } },
    take: 10,
  });

  if (customers.length === 0) return [];

  const customerIds = customers
    .map((c) => c.customerId)
    .filter((id): id is string => id !== null);

  const users = await prisma.user.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  return customers.map((c) => {
    const user = c.customerId ? userMap.get(c.customerId) : null;
    return {
      id: c.customerId ?? "",
      name: user
        ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
        : "Unknown",
      email: user?.email ?? "",
      totalSpent: Math.round((c._sum.totalAmount ?? 0) * 100) / 100,
      orderCount: c._count,
      customerSince: user?.createdAt ?? null,
    };
  });
}

// =============================================================================
// Customer Growth Trend
// =============================================================================

export async function getCustomerGrowth(range: DateRange) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const periodStart = getDateRangeStart(range);

  const customers = await prisma.user.findMany({
    where: {
      tenantId: tenant.id,
      role: "customer",
      createdAt: { gte: periodStart },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const useMonths = range === "12m";
  const buckets: Record<string, number> = {};

  if (useMonths) {
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[key] = 0;
    }
  } else {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets[d.toISOString().split("T")[0]] = 0;
    }
  }

  for (const customer of customers) {
    const key = useMonths
      ? `${customer.createdAt.getFullYear()}-${String(customer.createdAt.getMonth() + 1).padStart(2, "0")}`
      : customer.createdAt.toISOString().split("T")[0];
    if (key in buckets) {
      buckets[key] += 1;
    }
  }

  return Object.entries(buckets).map(([date, count]) => ({ date, newCustomers: count }));
}

// =============================================================================
// CSV Export Data
// =============================================================================

export async function getOrdersForExport(range: DateRange) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const periodStart = getDateRangeStart(range);

  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      createdAt: { gte: periodStart },
    },
    select: {
      orderNumber: true,
      orderType: true,
      status: true,
      subtotal: true,
      taxAmount: true,
      deliveryFee: true,
      discountAmount: true,
      tipAmount: true,
      totalAmount: true,
      paymentMethod: true,
      createdAt: true,
      paidAt: true,
      customer: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((o) => ({
    orderNumber: o.orderNumber,
    date: o.createdAt.toISOString().split("T")[0],
    customer: o.customer
      ? `${o.customer.firstName ?? ""} ${o.customer.lastName ?? ""}`.trim() || o.customer.email
      : "Walk-in",
    type: o.orderType,
    status: o.status,
    subtotal: o.subtotal,
    tax: o.taxAmount,
    deliveryFee: o.deliveryFee,
    discount: o.discountAmount,
    tip: o.tipAmount,
    total: o.totalAmount,
    paymentMethod: o.paymentMethod ?? "",
    paidAt: o.paidAt?.toISOString().split("T")[0] ?? "",
  }));
}
