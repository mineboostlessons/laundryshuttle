"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth-helpers";
import { isPointInServiceArea, findZoneForPoint } from "@/lib/mapbox";
import { generateOrderNumber } from "@/lib/utils";
import { notifyOrderConfirmed } from "@/lib/notifications";
import {
  addDays,
  format,
  isBefore,
  isEqual,
  parseISO,
  startOfDay,
} from "date-fns";

// =============================================================================
// Schemas
// =============================================================================

const addressSchema = z.object({
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(5, "ZIP code is required"),
  lat: z.number(),
  lng: z.number(),
  label: z.string().optional(),
  pickupNotes: z.string().optional(),
});

const createOrderSchema = z.object({
  services: z
    .array(
      z.object({
        serviceId: z.string(),
        quantity: z.number().min(1),
      })
    )
    .min(1, "Select at least one service"),
  serviceType: z.enum(["laundry_only", "dry_cleaning_only", "laundry_and_dry_cleaning"]),
  address: addressSchema,
  pickupDate: z.string().min(1, "Pickup date is required"),
  pickupTimeSlot: z.string().min(1, "Pickup time slot is required"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  deliveryTimeSlot: z.string().min(1, "Delivery time slot is required"),
  specialInstructions: z.string().optional(),
  preferences: z
    .object({
      detergent: z.string().optional(),
      waterTemp: z.string().optional(),
      fabricSoftener: z.boolean().optional(),
      dryerTemp: z.string().optional(),
    })
    .optional(),
});

// =============================================================================
// Get Available Time Slots
// =============================================================================

export interface TimeSlotData {
  pickupDays: string[];
  deliveryDays: string[];
  pickupTimeSlots: string[];
  deliveryTimeSlots: string[];
  sameDayPickupEnabled: boolean;
  sameDayPickupCutoff: string | null;
  minHoursBeforeDelivery: number;
  blockedDates: Array<{ date: string; reason: string }>;
}

export async function getAvailableTimeSlots(): Promise<TimeSlotData> {
  const tenant = await requireTenant();

  const laundromat = await prisma.laundromat.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    select: {
      pickupDays: true,
      deliveryDays: true,
      pickupTimeSlots: true,
      deliveryTimeSlots: true,
      sameDayPickupEnabled: true,
      sameDayPickupCutoff: true,
      minHoursBeforeDelivery: true,
      blockedDates: true,
    },
  });

  if (!laundromat) {
    return {
      pickupDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      deliveryDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      pickupTimeSlots: ["9am-12pm", "12pm-3pm", "3pm-6pm"],
      deliveryTimeSlots: ["9am-12pm", "12pm-3pm", "3pm-6pm"],
      sameDayPickupEnabled: false,
      sameDayPickupCutoff: null,
      minHoursBeforeDelivery: 24,
      blockedDates: [],
    };
  }

  return {
    pickupDays: (laundromat.pickupDays as string[]) ?? [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ],
    deliveryDays: (laundromat.deliveryDays as string[]) ?? [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ],
    pickupTimeSlots: (laundromat.pickupTimeSlots as string[]) ?? [
      "9am-12pm",
      "12pm-3pm",
      "3pm-6pm",
    ],
    deliveryTimeSlots: (laundromat.deliveryTimeSlots as string[]) ?? [
      "9am-12pm",
      "12pm-3pm",
      "3pm-6pm",
    ],
    sameDayPickupEnabled: laundromat.sameDayPickupEnabled,
    sameDayPickupCutoff: laundromat.sameDayPickupCutoff,
    minHoursBeforeDelivery: laundromat.minHoursBeforeDelivery,
    blockedDates:
      (laundromat.blockedDates as Array<{ date: string; reason: string }>) ??
      [],
  };
}

// =============================================================================
// Validate Service Area
// =============================================================================

export async function validateServiceArea(
  lat: number,
  lng: number
): Promise<{ inArea: boolean; laundromatId: string | null }> {
  const tenant = await requireTenant();

  const laundromats = await prisma.laundromat.findMany({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true, serviceAreaPolygons: true },
  });

  for (const loc of laundromats) {
    const polygons = loc.serviceAreaPolygons as GeoJSON.FeatureCollection | null;
    if (isPointInServiceArea(lat, lng, polygons)) {
      return { inArea: true, laundromatId: loc.id };
    }
  }

  return { inArea: false, laundromatId: null };
}

// =============================================================================
// Get Tenant Services
// =============================================================================

export async function getTenantServices() {
  const tenant = await requireTenant();

  return prisma.service.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      pricingType: true,
      price: true,
      icon: true,
    },
  });
}

// =============================================================================
// Get Available Dates
// =============================================================================

export async function getAvailableDates(
  allowedDays: string[],
  blockedDates: Array<{ date: string; reason: string }>,
  startFrom: Date = new Date(),
  count: number = 14
): Promise<string[]> {
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const blocked = new Set(blockedDates.map((b) => b.date));
  const dates: string[] = [];
  let current = startOfDay(startFrom);

  for (let i = 0; i < 60 && dates.length < count; i++) {
    const dayName = dayNames[current.getDay()];
    const dateStr = format(current, "yyyy-MM-dd");

    if (
      allowedDays.includes(dayName) &&
      !blocked.has(dateStr) &&
      !isBefore(current, startOfDay(new Date()))
    ) {
      dates.push(dateStr);
    }

    current = addDays(current, 1);
  }

  return dates;
}

// =============================================================================
// Create Order
// =============================================================================

export async function createOrder(
  input: z.infer<typeof createOrderSchema>
): Promise<{ success: boolean; orderId?: string; orderNumber?: string; error?: string }> {
  const tenant = await requireTenant();
  const session = await getSession();

  // Validate input
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  // Find active laundromat
  const laundromat = await prisma.laundromat.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true, serviceAreaPolygons: true },
  });

  if (!laundromat) {
    return { success: false, error: "No active location found" };
  }

  // Validate service area
  const inArea = isPointInServiceArea(
    data.address.lat,
    data.address.lng,
    laundromat.serviceAreaPolygons as GeoJSON.FeatureCollection | null
  );

  if (!inArea) {
    return {
      success: false,
      error: "Your address is outside our service area",
    };
  }

  // Fetch services to calculate pricing
  const serviceIds = data.services.map((s) => s.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, tenantId: tenant.id, isActive: true },
  });

  if (services.length !== serviceIds.length) {
    return { success: false, error: "One or more services are no longer available" };
  }

  // Calculate subtotal
  let subtotal = 0;
  const orderItems = data.services.map((item) => {
    const service = services.find((s) => s.id === item.serviceId)!;
    const totalPrice = service.price * item.quantity;
    subtotal += totalPrice;
    return {
      serviceId: service.id,
      itemType: "service" as const,
      name: service.name,
      quantity: item.quantity,
      unitPrice: service.price,
      totalPrice,
    };
  });

  // Generate order number
  const orderCount = await prisma.order.count({
    where: { tenantId: tenant.id },
  });
  const prefix = tenant.slug.substring(0, 3).toUpperCase();
  const orderNumber = generateOrderNumber(prefix, orderCount + 1);

  // Tax
  const tenantRecord = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: { defaultTaxRate: true },
  });
  const taxRate = tenantRecord?.defaultTaxRate ?? 0;
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  // Reuse existing customer address or create a new one
  let addressId: string | undefined;
  if (session?.user?.id) {
    // Check for an existing address with the same addressLine1
    const existing = await prisma.customerAddress.findFirst({
      where: {
        userId: session.user.id,
        addressLine1: data.address.addressLine1,
      },
    });

    if (existing) {
      // Update mutable fields on the existing address
      await prisma.customerAddress.update({
        where: { id: existing.id },
        data: {
          addressLine2: data.address.addressLine2 ?? existing.addressLine2,
          city: data.address.city,
          state: data.address.state,
          zip: data.address.zip,
          lat: data.address.lat,
          lng: data.address.lng,
          pickupNotes: data.address.pickupNotes ?? existing.pickupNotes,
        },
      });
      addressId = existing.id;
    } else {
      const address = await prisma.customerAddress.create({
        data: {
          userId: session.user.id,
          label: data.address.label ?? "Pickup Address",
          addressLine1: data.address.addressLine1,
          addressLine2: data.address.addressLine2 ?? null,
          city: data.address.city,
          state: data.address.state,
          zip: data.address.zip,
          lat: data.address.lat,
          lng: data.address.lng,
          pickupNotes: data.address.pickupNotes ?? null,
        },
      });
      addressId = address.id;
    }
  }

  // Auto-assign driver based on zone mapping
  const polygons = laundromat.serviceAreaPolygons as GeoJSON.FeatureCollection | null;
  let assignedDriverId: string | null = null;

  const zone = findZoneForPoint(data.address.lat, data.address.lng, polygons);
  if (zone?.featureId) {
    // Check for a temporary override first
    const pickupDate = parseISO(data.pickupDate);
    const override = await prisma.zoneDriverOverride.findFirst({
      where: {
        laundromatId: laundromat.id,
        zoneFeatureId: zone.featureId,
        startDate: { lte: pickupDate },
        endDate: { gte: pickupDate },
      },
      select: { driverId: true },
      orderBy: { createdAt: "desc" },
    });

    if (override) {
      assignedDriverId = override.driverId;
    } else if (zone.driverId) {
      // Verify the default driver still exists and is active
      const driver = await prisma.user.findFirst({
        where: { id: zone.driverId, tenantId: tenant.id, role: "driver", isActive: true },
        select: { id: true },
      });
      if (driver) {
        assignedDriverId = driver.id;
      }
    }
  }

  // Create order — auto-confirmed
  const order = await prisma.order.create({
    data: {
      orderNumber,
      tenantId: tenant.id,
      laundromatId: laundromat.id,
      customerId: session?.user?.id ?? null,
      driverId: assignedDriverId,
      orderType: "delivery",
      serviceType: data.serviceType,
      pickupAddressId: addressId ?? null,
      pickupDate: parseISO(data.pickupDate),
      pickupTimeSlot: data.pickupTimeSlot,
      deliveryDate: parseISO(data.deliveryDate),
      deliveryTimeSlot: data.deliveryTimeSlot,
      pickupNotes: data.address.pickupNotes ?? null,
      specialInstructions: data.specialInstructions ?? null,
      preferencesSnapshot: data.preferences ?? undefined,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      status: "confirmed",
      items: {
        create: orderItems,
      },
      statusHistory: {
        create: {
          status: "confirmed",
          changedByUserId: session?.user?.id ?? null,
          notes: "Order placed and confirmed",
        },
      },
    },
  });

  // Send order confirmation notification (fire-and-forget)
  if (session?.user?.id) {
    notifyOrderConfirmed({
      tenantId: tenant.id,
      userId: session.user.id,
      orderNumber: order.orderNumber,
      total: totalAmount,
    }).catch((err) => console.error("Failed to send order confirmation:", err));
  }

  return {
    success: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
  };
}
