"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";
import { geocodeAddress } from "@/lib/mapbox";

// =============================================================================
// Get Business Info
// =============================================================================

export async function getBusinessInfo() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const tenantData = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      businessName: true,
      businessType: true,
      phone: true,
      email: true,
      website: true,
    },
  });

  const laundromat = await prisma.laundromat.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    select: {
      name: true,
      address: true,
      addressLine2: true,
      city: true,
      state: true,
      zip: true,
      phone: true,
      email: true,
      timezone: true,
    },
  });

  return {
    businessName: tenantData?.businessName ?? "",
    businessType: (tenantData?.businessType ?? "laundromat") as UpdateBusinessInfoInput["businessType"],
    phone: tenantData?.phone ?? "",
    email: tenantData?.email ?? "",
    website: tenantData?.website ?? "",
    locationName: laundromat?.name ?? "",
    address: laundromat?.address ?? "",
    addressLine2: laundromat?.addressLine2 ?? "",
    city: laundromat?.city ?? "",
    state: laundromat?.state ?? "",
    zip: laundromat?.zip ?? "",
    locationPhone: laundromat?.phone ?? "",
    locationEmail: laundromat?.email ?? "",
    timezone: laundromat?.timezone ?? "America/New_York",
  };
}

// =============================================================================
// Update Business Info
// =============================================================================

const updateBusinessInfoSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  businessType: z.enum(["laundromat", "dry_cleaner", "wash_and_fold", "combo"]),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  locationName: z.string().min(1, "Location name is required"),
  address: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required").max(2),
  zip: z.string().min(5, "ZIP code is required"),
  locationPhone: z.string().optional(),
  locationEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  timezone: z.string().min(1, "Timezone is required"),
});

export type UpdateBusinessInfoInput = z.infer<typeof updateBusinessInfoSchema>;

export async function updateBusinessInfo(input: UpdateBusinessInfoInput) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const parsed = updateBusinessInfoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  // Update tenant record
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      businessName: data.businessName,
      businessType: data.businessType,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
    },
  });

  // Update primary laundromat location
  const laundromat = await prisma.laundromat.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true },
  });

  if (laundromat) {
    // Geocode the address to update lat/lng for the service area map
    const fullAddress = `${data.address}, ${data.city}, ${data.state} ${data.zip}`;
    const geocoded = await geocodeAddress(fullAddress);

    await prisma.laundromat.update({
      where: { id: laundromat.id },
      data: {
        name: data.locationName,
        address: data.address,
        addressLine2: data.addressLine2 || null,
        city: data.city,
        state: data.state.toUpperCase(),
        zip: data.zip,
        phone: data.locationPhone || null,
        email: data.locationEmail || null,
        timezone: data.timezone,
        ...(geocoded ? { lat: geocoded.lat, lng: geocoded.lng } : {}),
      },
    });
  }

  revalidatePath("/settings");
  revalidatePath("/settings/business-info");

  return { success: true as const };
}
