"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { prisma } from "@/lib/prisma";
import { findZoneForPoint } from "@/lib/mapbox";
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
}): Promise<{ success: boolean; error?: string }> {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const parsed = updateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid polygon data" };
  }

  // Verify the laundromat belongs to this tenant
  const laundromat = await prisma.laundromat.findFirst({
    where: {
      id: parsed.data.laundromatId,
      tenantId: tenant.id,
      isActive: true,
    },
    select: { id: true },
  });

  if (!laundromat) {
    return { success: false, error: "Laundromat not found" };
  }

  await prisma.laundromat.update({
    where: { id: laundromat.id },
    data: {
      serviceAreaPolygons: parsed.data.polygons as unknown as Prisma.InputJsonValue,
    },
  });

  // Reassign drivers on all active orders based on the new zone-driver mappings
  const activeOrders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      laundromatId: laundromat.id,
      status: { in: ["confirmed", "ready", "out_for_delivery"] },
      // Only orders not yet in a route — routed orders shouldn't be reassigned mid-route
      routeStops: { none: {} },
    },
    select: {
      id: true,
      driverId: true,
      pickupDate: true,
      pickupAddress: { select: { lat: true, lng: true } },
    },
  });

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

      // If zone has no driver assigned, clear the driver
      if (!assignDriverId) {
        await prisma.order.update({
          where: { id: order.id },
          data: { driverId: null },
        });
        continue;
      }

      // Verify driver is active
      const driver = await prisma.user.findFirst({
        where: { id: assignDriverId, tenantId: tenant.id, role: "driver", isActive: true },
        select: { id: true },
      });

      if (driver) {
        await prisma.order.update({
          where: { id: order.id },
          data: { driverId: driver.id },
        });
      }
    }
  }

  revalidatePath("/settings/service-area");
  return { success: true };
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
