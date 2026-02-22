"use server";

import prisma from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

// =============================================================================
// Upsell Engine — Core Logic
// =============================================================================

export interface UpsellRecommendation {
  type: "subscription" | "service_addon" | "frequency_upgrade" | "winback";
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  priority: number; // higher = more important
  discount?: number;
  promoCode?: string;
}

/**
 * Get personalized upsell recommendations for a customer.
 */
export async function getUpsellsForCustomer(
  userId: string,
  tenantId: string
): Promise<UpsellRecommendation[]> {
  const recommendations: UpsellRecommendation[] = [];

  const [user, recentOrders, subscription, availablePlans] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, walletBalance: true },
    }),
    prisma.order.findMany({
      where: {
        customerId: userId,
        tenantId,
        status: { notIn: ["cancelled", "refunded"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        createdAt: true,
        totalAmount: true,
        orderType: true,
        isSubscriptionOrder: true,
        items: { select: { name: true, serviceId: true, itemType: true } },
      },
    }),
    prisma.customerSubscription.findFirst({
      where: { userId, status: { in: ["active", "paused"] } },
      include: { plan: true },
    }),
    prisma.subscriptionPlan.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, frequency: true, discountPercentage: true },
    }),
  ]);

  if (!user) return [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const ordersLast30 = recentOrders.filter(
    (o) => o.createdAt >= thirtyDaysAgo
  );

  // ──────────────────────────────────────────────
  // Rule 1: Subscription Nudge
  // If customer has 3+ orders in last 30 days and no subscription
  // ──────────────────────────────────────────────
  if (!subscription && ordersLast30.length >= 3 && availablePlans.length > 0) {
    const bestPlan = availablePlans.reduce((best, plan) =>
      (plan.discountPercentage ?? 0) > (best.discountPercentage ?? 0) ? plan : best
    );

    recommendations.push({
      type: "subscription",
      title: "Save with a subscription",
      description: `You've placed ${ordersLast30.length} orders this month. Subscribe to ${bestPlan.name} and save${
        bestPlan.discountPercentage ? ` ${bestPlan.discountPercentage}%` : ""
      } on every order.`,
      ctaText: "View Plans",
      ctaUrl: "/customer/subscriptions",
      priority: 90,
      discount: bestPlan.discountPercentage ?? undefined,
    });
  }

  // ──────────────────────────────────────────────
  // Rule 2: Frequency Upgrade
  // If customer has biweekly subscription but orders weekly
  // ──────────────────────────────────────────────
  if (subscription && subscription.plan.frequency === "biweekly" && ordersLast30.length >= 4) {
    const weeklyPlan = availablePlans.find((p) => p.frequency === "weekly");
    if (weeklyPlan) {
      recommendations.push({
        type: "frequency_upgrade",
        title: "Upgrade to weekly pickups",
        description: `You're ordering more than biweekly. Upgrade to ${weeklyPlan.name} for even more convenience.`,
        ctaText: "Upgrade",
        ctaUrl: "/customer/subscriptions",
        priority: 70,
      });
    }
  }

  // ──────────────────────────────────────────────
  // Rule 3: Service Add-on
  // If customer only uses wash & fold, suggest dry cleaning
  // ──────────────────────────────────────────────
  const serviceNames = new Set(
    recentOrders.flatMap((o) =>
      o.items.filter((i) => i.itemType === "service").map((i) => i.name.toLowerCase())
    )
  );

  const hasWashFold = Array.from(serviceNames).some(
    (n) => n.includes("wash") || n.includes("fold")
  );
  const hasDryCleaning = Array.from(serviceNames).some(
    (n) => n.includes("dry clean")
  );

  if (hasWashFold && !hasDryCleaning && recentOrders.length >= 2) {
    recommendations.push({
      type: "service_addon",
      title: "Try dry cleaning",
      description:
        "Add dry cleaning to your next order. Many customers bundle it with wash & fold for convenience.",
      ctaText: "Add to Next Order",
      ctaUrl: "/order",
      priority: 50,
    });
  }

  // Sort by priority (highest first)
  return recommendations.sort((a, b) => b.priority - a.priority);
}

// =============================================================================
// Win-Back Campaign Generator
// =============================================================================

export interface WinBackCandidate {
  userId: string;
  email: string;
  firstName: string | null;
  daysSinceLastOrder: number;
  totalOrders: number;
  totalSpent: number;
}

/**
 * Find customers eligible for win-back campaigns.
 * Returns customers who haven't ordered in 14, 21, or 45+ days.
 */
export async function getWinBackCandidates(tenantId: string): Promise<{
  mild: WinBackCandidate[]; // 14-20 days
  moderate: WinBackCandidate[]; // 21-44 days
  urgent: WinBackCandidate[]; // 45+ days
}> {
  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Get all customers who have ordered before but not recently
  const customers = await prisma.user.findMany({
    where: {
      tenantId,
      role: "customer",
      isActive: true,
      ordersAsCustomer: {
        some: {
          tenantId,
          status: { notIn: ["cancelled", "refunded"] },
        },
      },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      ordersAsCustomer: {
        where: {
          tenantId,
          status: { notIn: ["cancelled", "refunded"] },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
      _count: {
        select: {
          ordersAsCustomer: {
            where: { tenantId, status: { notIn: ["cancelled", "refunded"] } },
          },
        },
      },
    },
  });

  // Get total spent per customer
  const spentByCustomer = await prisma.order.groupBy({
    by: ["customerId"],
    where: {
      tenantId,
      paidAt: { not: null },
      status: { notIn: ["cancelled", "refunded"] },
      customerId: { in: customers.map((c) => c.id) },
    },
    _sum: { totalAmount: true },
  });

  const spentMap = new Map(
    spentByCustomer.map((s) => [s.customerId, s._sum.totalAmount ?? 0])
  );

  const mild: WinBackCandidate[] = [];
  const moderate: WinBackCandidate[] = [];
  const urgent: WinBackCandidate[] = [];

  for (const customer of customers) {
    const lastOrder = customer.ordersAsCustomer[0];
    if (!lastOrder) continue;

    const daysSince = Math.floor(
      (now.getTime() - lastOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince < 14) continue; // Still active

    const candidate: WinBackCandidate = {
      userId: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      daysSinceLastOrder: daysSince,
      totalOrders: customer._count.ordersAsCustomer,
      totalSpent: spentMap.get(customer.id) ?? 0,
    };

    if (daysSince >= 45) {
      urgent.push(candidate);
    } else if (daysSince >= 21) {
      moderate.push(candidate);
    } else {
      mild.push(candidate);
    }
  }

  return { mild, moderate, urgent };
}

// =============================================================================
// Auto-Generate Win-Back Promo Codes
// =============================================================================

export async function generateWinBackPromos(
  tenantId: string,
  tier: "mild" | "moderate" | "urgent"
): Promise<{ created: number }> {
  const discountMap = {
    mild: { type: "percentage" as const, value: 10, campaign: "winback_14d" },
    moderate: { type: "percentage" as const, value: 15, campaign: "winback_21d" },
    urgent: { type: "percentage" as const, value: 20, campaign: "winback_45d" },
  };

  const config = discountMap[tier];

  const candidates = await getWinBackCandidates(tenantId);
  const targetCustomers = candidates[tier];

  if (targetCustomers.length === 0) return { created: 0 };

  let created = 0;

  for (const customer of targetCustomers) {
    // Check if they already have an active win-back promo
    const existing = await prisma.promoCode.findFirst({
      where: {
        tenantId,
        campaignType: config.campaign,
        isActive: true,
        validUntil: { gte: new Date() },
      },
    });

    if (existing) continue;

    const code = `COMEBACK-${customer.firstName?.toUpperCase().slice(0, 3) ?? "CUS"}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 14); // 2 week expiry

    await prisma.promoCode.create({
      data: {
        tenantId,
        code,
        description: `Win-back ${config.value}% off for ${customer.firstName ?? customer.email}`,
        discountType: config.type,
        discountValue: config.value,
        maxUses: 1,
        maxUsesPerCustomer: 1,
        validFrom: new Date(),
        validUntil,
        isActive: true,
        campaignType: config.campaign,
      },
    });

    created++;
  }

  return { created };
}

// =============================================================================
// Popular Service Combos (for checkout upsell)
// =============================================================================

// =============================================================================
// Execute Win-Back Campaign — Send Promos via Email/SMS
// =============================================================================

export interface CampaignResult {
  created: number;
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Generate promo codes AND deliver them to customers via email/SMS.
 */
export async function executeWinBackCampaign(
  tenantId: string,
  tier: "mild" | "moderate" | "urgent"
): Promise<CampaignResult> {
  const discountMap = {
    mild: { type: "percentage" as const, value: 10, campaign: "winback_14d" },
    moderate: { type: "percentage" as const, value: 15, campaign: "winback_21d" },
    urgent: { type: "percentage" as const, value: 20, campaign: "winback_45d" },
  };

  const config = discountMap[tier];
  const candidates = await getWinBackCandidates(tenantId);
  const targetCustomers = candidates[tier];

  if (targetCustomers.length === 0) return { created: 0, sent: 0, failed: 0, errors: [] };

  let created = 0;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const customer of targetCustomers) {
    // Check if they already have an active win-back promo
    const existing = await prisma.promoCode.findFirst({
      where: {
        tenantId,
        campaignType: config.campaign,
        isActive: true,
        validUntil: { gte: new Date() },
      },
    });

    if (existing) continue;

    const code = `COMEBACK-${customer.firstName?.toUpperCase().slice(0, 3) ?? "CUS"}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 14);

    await prisma.promoCode.create({
      data: {
        tenantId,
        code,
        description: `Win-back ${config.value}% off for ${customer.firstName ?? customer.email}`,
        discountType: config.type,
        discountValue: config.value,
        maxUses: 1,
        maxUsesPerCustomer: 1,
        validFrom: new Date(),
        validUntil,
        isActive: true,
        campaignType: config.campaign,
      },
    });

    created++;

    // Send notification with promo code
    try {
      await sendNotification({
        tenantId,
        userId: customer.userId,
        event: "promo_available",
        recipientEmail: customer.email,
        variables: {
          customerName: customer.firstName ?? "there",
          promoCode: code,
          promoDescription: `We miss you! Here's ${config.value}% off your next order.`,
          discountValue: `${config.value}%`,
        },
      });
      sent++;
    } catch (error) {
      failed++;
      errors.push(
        `${customer.email}: ${error instanceof Error ? error.message : "Send failed"}`
      );
    }
  }

  return { created, sent, failed, errors };
}

// =============================================================================
// Campaign Analytics
// =============================================================================

export interface CampaignStats {
  campaignType: string;
  totalCodes: number;
  redeemedCodes: number;
  redemptionRate: number;
  revenueRecovered: number;
}

/**
 * Get performance stats for win-back campaigns.
 */
export async function getWinBackCampaignStats(
  tenantId: string
): Promise<CampaignStats[]> {
  const campaignTypes = ["winback_14d", "winback_21d", "winback_45d"];
  const stats: CampaignStats[] = [];

  for (const campaignType of campaignTypes) {
    const [promoCodes, redeemedOrders] = await Promise.all([
      prisma.promoCode.findMany({
        where: { tenantId, campaignType },
        select: { id: true, currentUses: true, code: true },
      }),
      prisma.order.aggregate({
        where: {
          tenantId,
          promoCode: { campaignType },
          status: { notIn: ["cancelled", "refunded"] },
          paidAt: { not: null },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

    const totalCodes = promoCodes.length;
    const redeemedCodes = promoCodes.filter((p) => p.currentUses > 0).length;

    stats.push({
      campaignType,
      totalCodes,
      redeemedCodes,
      redemptionRate: totalCodes > 0 ? (redeemedCodes / totalCodes) * 100 : 0,
      revenueRecovered: redeemedOrders._sum.totalAmount ?? 0,
    });
  }

  return stats;
}

// =============================================================================
// Popular Service Combos (for checkout upsell)
// =============================================================================

export async function getPopularAddons(
  tenantId: string,
  currentServiceIds: string[]
): Promise<Array<{ serviceId: string; name: string; coOccurrenceRate: number }>> {
  if (currentServiceIds.length === 0) return [];

  // Find orders that include the same services
  const relatedOrders = await prisma.orderItem.findMany({
    where: {
      order: {
        tenantId,
        status: { notIn: ["cancelled", "refunded"] },
      },
      serviceId: { in: currentServiceIds },
      itemType: "service",
    },
    select: { orderId: true },
    distinct: ["orderId"],
    take: 100,
  });

  const orderIds = relatedOrders.map((o) => o.orderId);
  if (orderIds.length === 0) return [];

  // Find other services commonly ordered alongside
  const coItems = await prisma.orderItem.findMany({
    where: {
      orderId: { in: orderIds },
      itemType: "service",
      serviceId: { notIn: currentServiceIds, not: null },
    },
    select: { serviceId: true, name: true },
  });

  // Count occurrences
  const counts: Record<string, { name: string; count: number }> = {};
  for (const item of coItems) {
    if (!item.serviceId) continue;
    if (!counts[item.serviceId]) {
      counts[item.serviceId] = { name: item.name, count: 0 };
    }
    counts[item.serviceId].count++;
  }

  return Object.entries(counts)
    .map(([serviceId, data]) => ({
      serviceId,
      name: data.name,
      coOccurrenceRate: Math.round((data.count / orderIds.length) * 100),
    }))
    .filter((a) => a.coOccurrenceRate >= 20) // At least 20% co-occurrence
    .sort((a, b) => b.coOccurrenceRate - a.coOccurrenceRate)
    .slice(0, 3);
}
