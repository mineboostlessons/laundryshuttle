"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { prisma } from "@/lib/prisma";
import { findZoneForPoint } from "@/lib/mapbox";
import { notifyDriverZoneChange } from "@/lib/notifications";
import type { Prisma } from "@prisma/client";

export async function getServiceArea() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const laundromat = await prisma.laundromat.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    select: {
      id: true,
      name: true,
      lat: true,
      lng: true,
      serviceAreaPolygons: true,
    },
  });

  if (!laundromat) {
    return null;
  }

  return {
    id: laundromat.id,
    name: laundromat.name,
    lat: laundromat.lat,
    lng: laundromat.lng,
    serviceAreaPolygons: laundromat.serviceAreaPolygons as GeoJSON.FeatureCollection | null,
  };
}

const updateSchema = z.object({
  laundromatId: z.string().min(1),
  polygons: z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(z.object({
      type: z.literal("Feature"),
      id: z.union([z.string(), z.number()]).optional(),
      properties: z.record(z.unknown()).nullable(),
      geometry: z.object({
        type: z.enum(["Polygon", "MultiPolygon"]),
        coordinates: z.array(z.unknown()),
      }),
    })),
  }),
});

export async function updateServiceArea(data: {
  laundromatId: string;
  polygons: GeoJSON.FeatureCollection;
}): Promise<{ success: boolean; error?: string; reassignedCount?: number }> {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const parsed = updateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid polygon data" };
  }

  // Verify the laundromat belongs to this tenant and load old polygons
  const laundromat = await prisma.laundromat.findFirst({
    where: {
      id: parsed.data.laundromatId,
      tenantId: tenant.id,
      isActive: true,
    },
    select: { id: true, serviceAreaPolygons: true },
  });

  if (!laundromat) {
    return { success: false, error: "Laundromat not found" };
  }

  const oldPolygons = laundromat.serviceAreaPolygons as GeoJSON.FeatureCollection | null;

  await prisma.laundromat.update({
    where: { id: laundromat.id },
    data: {
      serviceAreaPolygons: parsed.data.polygons as unknown as Prisma.InputJsonValue,
    },
  });

  // Reassign drivers on ALL active orders based on the new zone-driver mappings
  const activeOrders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      laundromatId: laundromat.id,
      status: { in: ["confirmed", "ready", "out_for_delivery"] },
    },
    select: {
      id: true,
      driverId: true,
      pickupDate: true,
      pickupAddress: { select: { lat: true, lng: true } },
      routeStops: {
        select: {
          id: true,
          route: { select: { id: true, status: true, driverId: true } },
        },
      },
    },
  });

  let reassignedCount = 0;

  if (activeOrders.length > 0) {
    const polygons = parsed.data.polygons as GeoJSON.FeatureCollection;

    for (const order of activeOrders) {
      if (!order.pickupAddress?.lat || !order.pickupAddress?.lng) continue;

      const zone = findZoneForPoint(order.pickupAddress.lat, order.pickupAddress.lng, polygons);
      // If order falls outside all zones, leave it as-is
      if (!zone) continue;

      // Determine the correct driver for this zone
      let assignDriverId = zone.driverId || null;

      // Check for temporal override
      if (zone.featureId && order.pickupDate) {
        const override = await prisma.zoneDriverOverride.findFirst({
          where: {
            laundromatId: laundromat.id,
            zoneFeatureId: zone.featureId,
            startDate: { lte: order.pickupDate },
            endDate: { gte: order.pickupDate },
          },
          select: { driverId: true },
          orderBy: { createdAt: "desc" },
        });
        if (override) {
          assignDriverId = override.driverId;
        }
      }

      // Skip if driver hasn't changed
      if (assignDriverId === order.driverId) continue;

      // Verify new driver is active (if assigning one)
      if (assignDriverId) {
        const driver = await prisma.user.findFirst({
          where: { id: assignDriverId, tenantId: tenant.id, role: "driver", isActive: true },
          select: { id: true },
        });
        if (!driver) continue;
      }

      // Update the order's driver
      await prisma.order.update({
        where: { id: order.id },
        data: { driverId: assignDriverId },
      });
      reassignedCount++;

      // Clean up route stops from planned routes (not in-progress/completed)
      const plannedStops = order.routeStops.filter(
        (rs) => rs.route.status === "planned"
      );
      if (plannedStops.length > 0) {
        await prisma.routeStop.deleteMany({
          where: { id: { in: plannedStops.map((s) => s.id) } },
        });

        // Delete any planned routes that are now empty
        const affectedRouteIds = [...new Set(plannedStops.map((s) => s.route.id))];
        for (const routeId of affectedRouteIds) {
          const remaining = await prisma.routeStop.count({ where: { routeId } });
          if (remaining === 0) {
            await prisma.driverRoute.delete({ where: { id: routeId } });
          }
        }
      }
    }
  }

  // Notify drivers about zone assignment changes (fire-and-forget)
  const newPolygons = parsed.data.polygons as GeoJSON.FeatureCollection;
  const oldDriverMap = new Map<string, string | null>();
  const newDriverMap = new Map<string, string | null>();

  if (oldPolygons?.features) {
    for (const f of oldPolygons.features) {
      const fId = String(f.id ?? "");
      if (fId) {
        oldDriverMap.set(fId, (f.properties?.driverId as string) ?? null);
      }
    }
  }
  for (const f of newPolygons.features) {
    const fId = String(f.id ?? "");
    if (fId) {
      newDriverMap.set(fId, (f.properties?.driverId as string) ?? null);
    }
  }

  // Compare old vs new zone driver assignments
  const allZoneIds = new Set([...oldDriverMap.keys(), ...newDriverMap.keys()]);
  for (const zoneId of allZoneIds) {
    const oldDriver = oldDriverMap.get(zoneId) ?? null;
    const newDriver = newDriverMap.get(zoneId) ?? null;
    if (oldDriver === newDriver) continue;

    const zoneName =
      newPolygons.features.find((f) => String(f.id ?? "") === zoneId)?.properties?.name ??
      oldPolygons?.features.find((f) => String(f.id ?? "") === zoneId)?.properties?.name ??
      `Zone ${zoneId}`;

    if (oldDriver) {
      notifyDriverZoneChange({
        tenantId: tenant.id,
        driverId: oldDriver,
        zoneName: zoneName as string,
        assigned: false,
      }).catch((err) => console.error("Failed to notify driver zone unassign:", err));
    }
    if (newDriver) {
      notifyDriverZoneChange({
        tenantId: tenant.id,
        driverId: newDriver,
        zoneName: zoneName as string,
        assigned: true,
      }).catch((err) => console.error("Failed to notify driver zone assign:", err));
    }
  }

  revalidatePath("/settings/service-area");
  return { success: true, reassignedCount };
}

// =============================================================================
// Zone Driver Override CRUD
// =============================================================================

const createOverrideSchema = z.object({
  laundromatId: z.string().min(1),
  zoneFeatureId: z.string().min(1),
  driverId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().optional(),
});

export async function createZoneOverride(input: z.infer<typeof createOverrideSchema>): Promise<{ success: boolean; error?: string }> {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const parsed = createOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { laundromatId, zoneFeatureId, driverId, startDate, endDate, reason } = parsed.data;

  // Verify laundromat belongs to tenant
  const laundromat = await prisma.laundromat.findFirst({
    where: { id: laundromatId, tenantId: tenant.id, isActive: true },
    select: { id: true, serviceAreaPolygons: true },
  });
  if (!laundromat) return { success: false, error: "Laundromat not found" };

  // Verify driver belongs to tenant
  const driver = await prisma.user.findFirst({
    where: { id: driverId, tenantId: tenant.id, role: "driver", isActive: true },
    select: { id: true },
  });
  if (!driver) return { success: false, error: "Driver not found" };

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return { success: false, error: "End date must be after start date" };

  const override = await prisma.zoneDriverOverride.create({
    data: {
      laundromatId,
      zoneFeatureId,
      driverId,
      startDate: start,
      endDate: end,
      reason: reason || null,
    },
  });

  // Reassign existing confirmed orders in this zone for the override period
  const confirmedOrders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      laundromatId,
      status: "confirmed",
      pickupDate: { gte: start, lte: end },
    },
    select: {
      id: true,
      pickupAddress: {
        select: { lat: true, lng: true },
      },
    },
  });

  const polygons = laundromat.serviceAreaPolygons as GeoJSON.FeatureCollection | null;
  const orderIdsToReassign: string[] = [];

  for (const order of confirmedOrders) {
    if (!order.pickupAddress?.lat || !order.pickupAddress?.lng) continue;
    const zone = findZoneForPoint(order.pickupAddress.lat, order.pickupAddress.lng, polygons);
    if (zone?.featureId === zoneFeatureId) {
      orderIdsToReassign.push(order.id);
    }
  }

  if (orderIdsToReassign.length > 0) {
    await prisma.order.updateMany({
      where: { id: { in: orderIdsToReassign } },
      data: { driverId },
    });
  }

  revalidatePath("/settings/service-area");
  return { success: true };
}

export async function deleteZoneOverride(overrideId: string): Promise<{ success: boolean; error?: string }> {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  // Verify the override belongs to a laundromat owned by this tenant
  const override = await prisma.zoneDriverOverride.findFirst({
    where: { id: overrideId },
    include: { laundromat: { select: { tenantId: true } } },
  });

  if (!override || override.laundromat.tenantId !== tenant.id) {
    return { success: false, error: "Override not found" };
  }

  await prisma.zoneDriverOverride.delete({ where: { id: overrideId } });

  revalidatePath("/settings/service-area");
  return { success: true };
}

export async function getZoneOverrides(laundromatId: string) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  // Verify laundromat belongs to tenant
  const laundromat = await prisma.laundromat.findFirst({
    where: { id: laundromatId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!laundromat) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.zoneDriverOverride.findMany({
    where: {
      laundromatId,
      endDate: { gte: today }, // Only active + upcoming overrides
    },
    include: {
      driver: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { startDate: "asc" },
  });
}
