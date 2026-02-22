"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";

// =============================================================================
// Owner Dashboard Stats
// =============================================================================

export async function getOwnerDashboardStats() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayOrders,
    weekOrders,
    monthOrders,
    todayRevenue,
    weekRevenue,
    monthRevenue,
    statusCounts,
    totalCustomers,
    totalStaff,
    recentOrders,
    staffMembers,
  ] = await Promise.all([
    // Order counts
    prisma.order.count({
      where: { tenantId: tenant.id, createdAt: { gte: todayStart } },
    }),
    prisma.order.count({
      where: { tenantId: tenant.id, createdAt: { gte: weekStart } },
    }),
    prisma.order.count({
      where: { tenantId: tenant.id, createdAt: { gte: monthStart } },
    }),

    // Revenue (paid orders only)
    prisma.order.aggregate({
      where: {
        tenantId: tenant.id,
        paidAt: { not: null },
        createdAt: { gte: todayStart },
        status: { notIn: ["refunded", "cancelled"] },
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        tenantId: tenant.id,
        paidAt: { not: null },
        createdAt: { gte: weekStart },
        status: { notIn: ["refunded", "cancelled"] },
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        tenantId: tenant.id,
        paidAt: { not: null },
        createdAt: { gte: monthStart },
        status: { notIn: ["refunded", "cancelled"] },
      },
      _sum: { totalAmount: true },
    }),

    // Orders by status
    prisma.order.groupBy({
      by: ["status"],
      where: { tenantId: tenant.id },
      _count: true,
    }),

    // Total customers
    prisma.user.count({
      where: { tenantId: tenant.id, role: "customer", isActive: true },
    }),

    // Total staff
    prisma.user.count({
      where: {
        tenantId: tenant.id,
        role: { in: ["manager", "attendant", "driver"] },
        isActive: true,
      },
    }),

    // Recent orders
    prisma.order.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderType: true,
        totalAmount: true,
        createdAt: true,
        customer: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    }),

    // Staff members
    prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        role: { in: ["manager", "attendant", "driver"] },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        lastLoginAt: true,
      },
      orderBy: { lastLoginAt: "desc" },
      take: 10,
    }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const s of statusCounts) {
    statusMap[s.status] = s._count;
  }

  return {
    orders: {
      today: todayOrders,
      week: weekOrders,
      month: monthOrders,
    },
    revenue: {
      today: todayRevenue._sum.totalAmount ?? 0,
      week: weekRevenue._sum.totalAmount ?? 0,
      month: monthRevenue._sum.totalAmount ?? 0,
    },
    statusCounts: statusMap,
    totalCustomers,
    totalStaff,
    recentOrders,
    staffMembers,
  };
}

// =============================================================================
// Revenue Chart Data (last 30 days)
// =============================================================================

export async function getRevenueChartData() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      paidAt: { not: null },
      createdAt: { gte: thirtyDaysAgo },
      status: { notIn: ["refunded", "cancelled"] },
    },
    select: {
      totalAmount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by day
  const dailyRevenue: Record<string, number> = {};
  const dailyCount: Record<string, number> = {};

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const key = date.toISOString().split("T")[0];
    dailyRevenue[key] = 0;
    dailyCount[key] = 0;
  }

  for (const order of orders) {
    const key = order.createdAt.toISOString().split("T")[0];
    if (key in dailyRevenue) {
      dailyRevenue[key] += order.totalAmount;
      dailyCount[key] += 1;
    }
  }

  return Object.entries(dailyRevenue).map(([date, revenue]) => ({
    date,
    revenue: Math.round(revenue * 100) / 100,
    orders: dailyCount[date],
  }));
}

// =============================================================================
// Staff Management
// =============================================================================

export async function getStaffList() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  return prisma.user.findMany({
    where: {
      tenantId: tenant.id,
      role: { in: ["manager", "attendant", "driver"] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
  });
}
