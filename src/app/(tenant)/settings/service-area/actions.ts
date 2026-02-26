"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function getServiceArea() {
  await requireRole(UserRole.OWNER);
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
  await requireRole(UserRole.OWNER);
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

  revalidatePath("/settings/service-area");
  return { success: true };
}
