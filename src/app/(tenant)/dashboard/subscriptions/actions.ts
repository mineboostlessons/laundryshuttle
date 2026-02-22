"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { stripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const planSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  frequency: z.enum(["weekly", "biweekly", "monthly"]),
  discountPercentage: z.number().min(0).max(100).nullable(),
  isActive: z.boolean(),
});

// =============================================================================
// List Plans with Subscriber Counts
// =============================================================================

export async function getSubscriptionPlans() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const plans = await prisma.subscriptionPlan.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          subscriptions: {
            where: { status: { in: ["active", "paused"] } },
          },
        },
      },
    },
  });

  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    frequency: p.frequency,
    discountPercentage: p.discountPercentage,
    stripePriceId: p.stripePriceId,
    isActive: p.isActive,
    createdAt: p.createdAt,
    subscriberCount: p._count.subscriptions,
  }));
}

// =============================================================================
// Get Subscribers for a Plan
// =============================================================================

export async function getPlanSubscribers(planId: string) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  // Verify plan belongs to tenant
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { id: planId, tenantId: tenant.id },
  });
  if (!plan) throw new Error("Plan not found");

  return prisma.customerSubscription.findMany({
    where: { planId },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
}

// =============================================================================
// Create Plan
// =============================================================================

export async function createSubscriptionPlan(data: z.infer<typeof planSchema>) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();
  const parsed = planSchema.parse(data);

  // Create Stripe Price if the tenant has a connected account
  let stripePriceId: string | null = null;
  const tenantFull = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: { stripeConnectAccountId: true, stripeOnboardingComplete: true },
  });

  if (tenantFull?.stripeConnectAccountId && tenantFull.stripeOnboardingComplete) {
    try {
      const intervalMap: Record<string, { interval: "week" | "month"; intervalCount: number }> = {
        weekly: { interval: "week", intervalCount: 1 },
        biweekly: { interval: "week", intervalCount: 2 },
        monthly: { interval: "month", intervalCount: 1 },
      };

      const { interval, intervalCount } = intervalMap[parsed.frequency];

      // Create a product and price on the connected account
      const product = await stripe.products.create(
        { name: `${parsed.name} - Subscription Plan`, metadata: { tenantId: tenant.id } },
        { stripeAccount: tenantFull.stripeConnectAccountId }
      );

      // Price is $0 placeholder — actual order charges happen via destination charges
      const price = await stripe.prices.create(
        {
          product: product.id,
          currency: "usd",
          recurring: { interval, interval_count: intervalCount },
          unit_amount: 0, // $0 — subscription tracks scheduling, not billing
          metadata: { tenantId: tenant.id },
        },
        { stripeAccount: tenantFull.stripeConnectAccountId }
      );

      stripePriceId = price.id;
    } catch {
      // Stripe integration is optional — plan still works without it
    }
  }

  const plan = await prisma.subscriptionPlan.create({
    data: {
      tenantId: tenant.id,
      name: parsed.name,
      frequency: parsed.frequency,
      discountPercentage: parsed.discountPercentage,
      stripePriceId,
      isActive: parsed.isActive,
    },
  });

  revalidatePath("/dashboard/subscriptions");
  return { success: true, plan };
}

// =============================================================================
// Update Plan
// =============================================================================

export async function updateSubscriptionPlan(
  planId: string,
  data: z.infer<typeof planSchema>
) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();
  const parsed = planSchema.parse(data);

  const existing = await prisma.subscriptionPlan.findFirst({
    where: { id: planId, tenantId: tenant.id },
  });
  if (!existing) throw new Error("Plan not found");

  const plan = await prisma.subscriptionPlan.update({
    where: { id: planId },
    data: {
      name: parsed.name,
      frequency: parsed.frequency,
      discountPercentage: parsed.discountPercentage,
      isActive: parsed.isActive,
    },
  });

  revalidatePath("/dashboard/subscriptions");
  return { success: true, plan };
}

// =============================================================================
// Toggle Plan Active Status
// =============================================================================

export async function togglePlanActive(planId: string) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const existing = await prisma.subscriptionPlan.findFirst({
    where: { id: planId, tenantId: tenant.id },
  });
  if (!existing) throw new Error("Plan not found");

  await prisma.subscriptionPlan.update({
    where: { id: planId },
    data: { isActive: !existing.isActive },
  });

  revalidatePath("/dashboard/subscriptions");
  return { success: true };
}

// =============================================================================
// Dashboard Summary
// =============================================================================

export async function getSubscriptionSummary() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const [totalPlans, activePlans, totalSubscribers, activeSubscribers] =
    await Promise.all([
      prisma.subscriptionPlan.count({ where: { tenantId: tenant.id } }),
      prisma.subscriptionPlan.count({ where: { tenantId: tenant.id, isActive: true } }),
      prisma.customerSubscription.count({
        where: { plan: { tenantId: tenant.id } },
      }),
      prisma.customerSubscription.count({
        where: { plan: { tenantId: tenant.id }, status: "active" },
      }),
    ]);

  return { totalPlans, activePlans, totalSubscribers, activeSubscribers };
}
