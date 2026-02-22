"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// =============================================================================
// Get Available Plans (for browsing)
// =============================================================================

export async function getAvailablePlans() {
  await requireRole(UserRole.CUSTOMER);
  const tenant = await requireTenant();

  return prisma.subscriptionPlan.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      frequency: true,
      discountPercentage: true,
    },
  });
}

// =============================================================================
// Get Customer's Active Subscription
// =============================================================================

export async function getMySubscription() {
  const session = await requireRole(UserRole.CUSTOMER);

  return prisma.customerSubscription.findFirst({
    where: { userId: session.user.id, status: { in: ["active", "paused"] } },
    include: {
      plan: {
        select: { id: true, name: true, frequency: true, discountPercentage: true },
      },
    },
  });
}

// =============================================================================
// Subscribe to a Plan
// =============================================================================

const subscribeSchema = z.object({
  planId: z.string().min(1),
  preferredDay: z.enum([
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  ]),
  preferredTimeSlot: z.string().min(1),
});

export async function subscribeToPlan(data: z.infer<typeof subscribeSchema>) {
  const session = await requireRole(UserRole.CUSTOMER);
  const tenant = await requireTenant();
  const parsed = subscribeSchema.parse(data);

  // Verify plan exists and belongs to tenant
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { id: parsed.planId, tenantId: tenant.id, isActive: true },
  });
  if (!plan) throw new Error("Plan not found");

  // Check if customer already has an active subscription
  const existing = await prisma.customerSubscription.findFirst({
    where: { userId: session.user.id, status: { in: ["active", "paused"] } },
  });
  if (existing) throw new Error("You already have an active subscription. Cancel it first.");

  // Calculate next pickup date
  const nextPickup = getNextPickupDate(parsed.preferredDay);

  const subscription = await prisma.customerSubscription.create({
    data: {
      userId: session.user.id,
      planId: parsed.planId,
      status: "active",
      preferredDay: parsed.preferredDay,
      preferredTimeSlot: parsed.preferredTimeSlot,
      nextPickupDate: nextPickup,
    },
  });

  revalidatePath("/customer/subscriptions");
  revalidatePath("/customer");
  return { success: true, subscription };
}

// =============================================================================
// Pause Subscription
// =============================================================================

export async function pauseSubscription() {
  const session = await requireRole(UserRole.CUSTOMER);

  const sub = await prisma.customerSubscription.findFirst({
    where: { userId: session.user.id, status: "active" },
  });
  if (!sub) throw new Error("No active subscription found");

  await prisma.customerSubscription.update({
    where: { id: sub.id },
    data: { status: "paused" },
  });

  revalidatePath("/customer/subscriptions");
  revalidatePath("/customer");
  return { success: true };
}

// =============================================================================
// Resume Subscription
// =============================================================================

export async function resumeSubscription() {
  const session = await requireRole(UserRole.CUSTOMER);

  const sub = await prisma.customerSubscription.findFirst({
    where: { userId: session.user.id, status: "paused" },
  });
  if (!sub) throw new Error("No paused subscription found");

  const nextPickup = sub.preferredDay
    ? getNextPickupDate(sub.preferredDay)
    : new Date();

  await prisma.customerSubscription.update({
    where: { id: sub.id },
    data: { status: "active", nextPickupDate: nextPickup },
  });

  revalidatePath("/customer/subscriptions");
  revalidatePath("/customer");
  return { success: true };
}

// =============================================================================
// Cancel Subscription
// =============================================================================

export async function cancelSubscription() {
  const session = await requireRole(UserRole.CUSTOMER);

  const sub = await prisma.customerSubscription.findFirst({
    where: { userId: session.user.id, status: { in: ["active", "paused"] } },
  });
  if (!sub) throw new Error("No subscription found");

  await prisma.customerSubscription.update({
    where: { id: sub.id },
    data: { status: "cancelled", cancelledAt: new Date() },
  });

  revalidatePath("/customer/subscriptions");
  revalidatePath("/customer");
  return { success: true };
}

// =============================================================================
// Update Preferences
// =============================================================================

const updatePrefsSchema = z.object({
  preferredDay: z.enum([
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  ]),
  preferredTimeSlot: z.string().min(1),
});

export async function updateSubscriptionPreferences(
  data: z.infer<typeof updatePrefsSchema>
) {
  const session = await requireRole(UserRole.CUSTOMER);
  const parsed = updatePrefsSchema.parse(data);

  const sub = await prisma.customerSubscription.findFirst({
    where: { userId: session.user.id, status: { in: ["active", "paused"] } },
  });
  if (!sub) throw new Error("No subscription found");

  const nextPickup = getNextPickupDate(parsed.preferredDay);

  await prisma.customerSubscription.update({
    where: { id: sub.id },
    data: {
      preferredDay: parsed.preferredDay,
      preferredTimeSlot: parsed.preferredTimeSlot,
      nextPickupDate: nextPickup,
    },
  });

  revalidatePath("/customer/subscriptions");
  return { success: true };
}

// =============================================================================
// Helpers
// =============================================================================

function getNextPickupDate(preferredDay: string): Date {
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const targetDay = dayMap[preferredDay] ?? 1;
  const now = new Date();
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;

  const next = new Date(now);
  next.setDate(next.getDate() + daysUntil);
  next.setHours(9, 0, 0, 0);
  return next;
}
