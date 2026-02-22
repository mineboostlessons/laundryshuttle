"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { optimizeRoute } from "@/lib/mapbox";
import { notifyDriverEnRoute, notifyDeliveryCompleted } from "@/lib/notifications";

// =============================================================================
// Driver Dashboard Data
// =============================================================================

export async function getDriverDashboardData() {
  const session = await requireRole(UserRole.DRIVER);
  const tenant = await requireTenant();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [todaysRoutes, todayStats, upcomingOrders] = await Promise.all([
    // Today's routes for this driver
    prisma.driverRoute.findMany({
      where: {
        driverId: session.user.id,
        date: { gte: todayStart, lt: todayEnd },
      },
      orderBy: { createdAt: "asc" },
      include: {
        laundromat: {
          select: { name: true, address: true, lat: true, lng: true },
        },
        stops: {
          orderBy: { sequence: "asc" },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                numBags: true,
                pickupNotes: true,
                specialInstructions: true,
                deliveryPhotoUrl: true,
                signatureUrl: true,
                customer: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    }),

    // Today's stats
    prisma.routeStop.groupBy({
      by: ["status"],
      where: {
        route: {
          driverId: session.user.id,
          date: { gte: todayStart, lt: todayEnd },
        },
      },
      _count: { id: true },
    }),

    // Orders assigned to this driver that need pickup/delivery today
    prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        driverId: session.user.id,
        status: { in: ["ready", "out_for_delivery"] },
      },
      orderBy: { deliveryDate: "asc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        pickupDate: true,
        deliveryDate: true,
        pickupTimeSlot: true,
        deliveryTimeSlot: true,
        pickupAddress: {
          select: {
            addressLine1: true,
            city: true,
            state: true,
            zip: true,
            lat: true,
            lng: true,
          },
        },
        customer: {
          select: { firstName: true, lastName: true, phone: true },
        },
      },
    }),
  ]);

  const statsMap: Record<string, number> = {};
  for (const stat of todayStats) {
    statsMap[stat.status] = stat._count.id;
  }

  return {
    routes: todaysRoutes,
    stats: {
      totalStops:
        (statsMap["pending"] ?? 0) +
        (statsMap["en_route"] ?? 0) +
        (statsMap["arrived"] ?? 0) +
        (statsMap["completed"] ?? 0) +
        (statsMap["skipped"] ?? 0),
      completed: statsMap["completed"] ?? 0,
      pending: statsMap["pending"] ?? 0,
      inProgress: (statsMap["en_route"] ?? 0) + (statsMap["arrived"] ?? 0),
      skipped: statsMap["skipped"] ?? 0,
    },
    upcomingOrders,
  };
}

// =============================================================================
// Get Route Detail
// =============================================================================

export async function getRouteDetail(routeId: string) {
  const session = await requireRole(UserRole.DRIVER);

  const route = await prisma.driverRoute.findFirst({
    where: {
      id: routeId,
      driverId: session.user.id,
    },
    include: {
      laundromat: {
        select: {
          name: true,
          address: true,
          lat: true,
          lng: true,
          phone: true,
        },
      },
      stops: {
        orderBy: { sequence: "asc" },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              orderType: true,
              numBags: true,
              totalWeightLbs: true,
              pickupNotes: true,
              specialInstructions: true,
              deliveryPhotoUrl: true,
              signatureUrl: true,
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!route) {
    return { success: false as const, error: "Route not found" };
  }

  return { success: true as const, route };
}

// =============================================================================
// Get Driver Route History
// =============================================================================

export async function getDriverRouteHistory(page: number = 1) {
  const session = await requireRole(UserRole.DRIVER);
  const limit = 20;
  const skip = (page - 1) * limit;

  const [routes, total] = await Promise.all([
    prisma.driverRoute.findMany({
      where: { driverId: session.user.id },
      orderBy: { date: "desc" },
      skip,
      take: limit,
      include: {
        laundromat: { select: { name: true } },
        stops: {
          select: { id: true, status: true },
        },
      },
    }),
    prisma.driverRoute.count({
      where: { driverId: session.user.id },
    }),
  ]);

  return {
    routes: routes.map((r) => ({
      ...r,
      totalStops: r.stops.length,
      completedStops: r.stops.filter((s) => s.status === "completed").length,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// =============================================================================
// Update Stop Status
// =============================================================================

const updateStopStatusSchema = z.object({
  stopId: z.string(),
  status: z.enum(["en_route", "arrived", "completed", "skipped"]),
});

export async function updateStopStatus(
  input: z.infer<typeof updateStopStatusSchema>
) {
  const session = await requireRole(UserRole.DRIVER);

  const parsed = updateStopStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { stopId, status } = parsed.data;

  const stop = await prisma.routeStop.findFirst({
    where: {
      id: stopId,
      route: { driverId: session.user.id },
    },
    include: { route: true },
  });

  if (!stop) {
    return { success: false, error: "Stop not found" };
  }

  // Update stop status
  await prisma.routeStop.update({
    where: { id: stopId },
    data: {
      status,
      ...(status === "completed" && { completedAt: new Date() }),
    },
  });

  // Update the corresponding order status
  const orderStatusMap: Record<string, string> = {
    en_route: stop.stopType === "pickup" ? "driver_en_route_pickup" : "out_for_delivery",
    arrived: stop.stopType === "pickup" ? "driver_arrived_pickup" : "driver_arrived_delivery",
    completed: stop.stopType === "pickup" ? "picked_up" : "delivered",
  };

  const newOrderStatus = orderStatusMap[status];
  if (newOrderStatus) {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: stop.orderId },
        data: { status: newOrderStatus },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId: stop.orderId,
          status: newOrderStatus,
          changedByUserId: session.user.id,
          notes: `Driver ${status} for ${stop.stopType}`,
        },
      }),
    ]);
  }

  // Send notification when driver is en route to delivery
  if (status === "en_route" && stop.stopType === "delivery") {
    const order = await prisma.order.findUnique({
      where: { id: stop.orderId },
      select: {
        customerId: true,
        orderNumber: true,
        tenantId: true,
      },
    });
    if (order?.customerId) {
      const driver = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { firstName: true },
      });
      notifyDriverEnRoute({
        tenantId: order.tenantId,
        userId: order.customerId,
        orderNumber: order.orderNumber,
        driverName: driver?.firstName ?? undefined,
      }).catch((err) => console.error("Driver notification error:", err));
    }
  }

  // Check if all stops in route are completed/skipped → mark route completed
  const remainingStops = await prisma.routeStop.count({
    where: {
      routeId: stop.routeId,
      status: { notIn: ["completed", "skipped"] },
    },
  });

  if (remainingStops === 0) {
    await prisma.driverRoute.update({
      where: { id: stop.routeId },
      data: { status: "completed" },
    });
  } else if (stop.route.status === "planned") {
    await prisma.driverRoute.update({
      where: { id: stop.routeId },
      data: { status: "in_progress" },
    });
  }

  return { success: true };
}

// =============================================================================
// Complete Delivery with Proof
// =============================================================================

const completeDeliverySchema = z.object({
  stopId: z.string(),
  deliveryPhotoUrl: z.string().url().optional(),
  signatureUrl: z.string().url().optional(),
});

export async function completeDelivery(
  input: z.infer<typeof completeDeliverySchema>
) {
  const session = await requireRole(UserRole.DRIVER);

  const parsed = completeDeliverySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { stopId, deliveryPhotoUrl, signatureUrl } = parsed.data;

  const stop = await prisma.routeStop.findFirst({
    where: {
      id: stopId,
      route: { driverId: session.user.id },
      stopType: "delivery",
    },
    include: { route: true },
  });

  if (!stop) {
    return { success: false, error: "Delivery stop not found" };
  }

  // Update stop as completed
  await prisma.routeStop.update({
    where: { id: stopId },
    data: { status: "completed", completedAt: new Date() },
  });

  // Update the order with delivery proof and mark as delivered
  await prisma.$transaction([
    prisma.order.update({
      where: { id: stop.orderId },
      data: {
        status: "delivered",
        ...(deliveryPhotoUrl && { deliveryPhotoUrl }),
        ...(signatureUrl && { signatureUrl }),
      },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId: stop.orderId,
        status: "delivered",
        changedByUserId: session.user.id,
        notes: "Delivery completed with proof",
        metadata: {
          deliveryPhotoUrl: deliveryPhotoUrl ?? null,
          signatureUrl: signatureUrl ?? null,
        },
      },
    }),
  ]);

  // Send delivery completed notification
  const deliveredOrder = await prisma.order.findUnique({
    where: { id: stop.orderId },
    select: { customerId: true, orderNumber: true, tenantId: true },
  });
  if (deliveredOrder?.customerId) {
    notifyDeliveryCompleted({
      tenantId: deliveredOrder.tenantId,
      userId: deliveredOrder.customerId,
      orderNumber: deliveredOrder.orderNumber,
    }).catch((err) => console.error("Delivery notification error:", err));
  }

  // Check if all stops in route are done
  const remainingStops = await prisma.routeStop.count({
    where: {
      routeId: stop.routeId,
      status: { notIn: ["completed", "skipped"] },
    },
  });

  if (remainingStops === 0) {
    await prisma.driverRoute.update({
      where: { id: stop.routeId },
      data: { status: "completed" },
    });
  }

  return { success: true };
}

// =============================================================================
// Optimize Route
// =============================================================================

export async function optimizeDriverRoute(routeId: string) {
  const session = await requireRole(UserRole.DRIVER);

  const route = await prisma.driverRoute.findFirst({
    where: {
      id: routeId,
      driverId: session.user.id,
    },
    include: {
      laundromat: { select: { lat: true, lng: true } },
      stops: {
        where: { status: "pending" },
        orderBy: { sequence: "asc" },
      },
    },
  });

  if (!route) {
    return { success: false, error: "Route not found" };
  }

  const pendingStops = route.stops;
  if (pendingStops.length < 2) {
    return { success: true, message: "Not enough stops to optimize" };
  }

  const depot = { lat: route.laundromat.lat, lng: route.laundromat.lng };
  const waypoints = pendingStops.map((s) => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
  }));

  const result = await optimizeRoute(depot, waypoints);
  if (!result) {
    return { success: false, error: "Route optimization failed" };
  }

  // Update stop sequences based on optimized order
  const updates = result.orderedStopIds.map((stopId, index) =>
    prisma.routeStop.update({
      where: { id: stopId },
      data: { sequence: index + 1 },
    })
  );

  await prisma.$transaction([
    ...updates,
    prisma.driverRoute.update({
      where: { id: routeId },
      data: {
        optimizedOrder: result.orderedStopIds,
      },
    }),
  ]);

  return {
    success: true,
    totalDurationMins: Math.round(result.totalDurationSecs / 60),
    totalDistanceMiles: Math.round((result.totalDistanceMeters / 1609.34) * 10) / 10,
  };
}

// =============================================================================
// Start Route
// =============================================================================

export async function startRoute(routeId: string) {
  const session = await requireRole(UserRole.DRIVER);

  const route = await prisma.driverRoute.findFirst({
    where: {
      id: routeId,
      driverId: session.user.id,
      status: "planned",
    },
  });

  if (!route) {
    return { success: false, error: "Route not found or already started" };
  }

  await prisma.driverRoute.update({
    where: { id: routeId },
    data: { status: "in_progress" },
  });

  return { success: true };
}

// =============================================================================
// Driver Earnings & Tips
// =============================================================================

export async function getDriverEarnings(params?: { period?: string }) {
  const session = await requireRole(UserRole.DRIVER);

  const now = new Date();
  let startDate: Date;

  switch (params?.period ?? "week") {
    case "today": {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    }
    case "month": {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "week":
    default: {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    }
  }

  const [tips, deliveriesCompleted, recentTips] = await Promise.all([
    prisma.tip.aggregate({
      where: {
        driverId: session.user.id,
        createdAt: { gte: startDate },
      },
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true },
    }),
    prisma.routeStop.count({
      where: {
        route: { driverId: session.user.id },
        status: "completed",
        completedAt: { gte: startDate },
      },
    }),
    prisma.tip.findMany({
      where: { driverId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        order: { select: { orderNumber: true } },
        user: { select: { firstName: true } },
      },
    }),
  ]);

  return {
    totalTips: tips._sum.amount ?? 0,
    tipCount: tips._count,
    averageTip: tips._avg.amount ?? 0,
    deliveriesCompleted,
    recentTips: recentTips.map((t) => ({
      id: t.id,
      amount: t.amount,
      orderNumber: t.order.orderNumber,
      customerName: t.user.firstName ?? "Customer",
      createdAt: t.createdAt.toISOString(),
    })),
  };
}
