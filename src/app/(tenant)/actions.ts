"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { isPointInServiceArea } from "@/lib/mapbox";

export async function checkServiceArea(lat: number, lng: number) {
  const tenant = await requireTenant();

  const laundromats = await prisma.laundromat.findMany({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true, serviceAreaPolygons: true },
  });

  for (const loc of laundromats) {
    const polygons = loc.serviceAreaPolygons as GeoJSON.FeatureCollection | null;
    if (isPointInServiceArea(lat, lng, polygons)) {
      return { serviceable: true };
    }
  }

  return { serviceable: false };
}

const interestSchema = z.object({
  email: z.string().email(),
  addressLine1: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
});

export async function saveServiceAreaInterest(input: z.infer<typeof interestSchema>) {
  const tenant = await requireTenant();

  const parsed = interestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input" };
  }

  const { email, addressLine1, city, state, zip, lat, lng } = parsed.data;

  // Check if this email+address already exists for this tenant
  const existing = await prisma.serviceAreaInterest.findFirst({
    where: {
      tenantId: tenant.id,
      email,
      addressLine1,
    },
  });

  if (existing) {
    return { success: true }; // Silently succeed — don't reveal existing entry
  }

  await prisma.serviceAreaInterest.create({
    data: {
      tenantId: tenant.id,
      email,
      addressLine1,
      city,
      state,
      zip,
      lat,
      lng,
    },
  });

  return { success: true };
}
