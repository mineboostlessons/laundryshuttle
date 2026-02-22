"use server";

import prisma from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

// =============================================================================
// TYPES
// =============================================================================

export interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  rewardedReferrals: number;
  totalRewardsGiven: number;
}

export interface ReferralProgramConfig {
  enabled: boolean;
  rewardAmount: number;
  rewardType: string;
  minOrderValue: number;
  codePrefix: string | null;
  expiryDays: number;
}

export interface CustomerReferralInfo {
  referralCode: string;
  shareUrl: string;
  totalReferrals: number;
  successfulReferrals: number;
  totalEarned: number;
  referrals: {
    id: string;
    referredEmail: string | null;
    status: string;
    rewardAmount: number | null;
    createdAt: Date;
  }[];
}

// =============================================================================
// CODE GENERATION
// =============================================================================

export async function generateReferralCode(prefix: string | null, userId: string): Promise<string> {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const userPart = userId.slice(-4).toUpperCase();
  if (prefix) {
    return `${prefix}-${userPart}${randomPart}`.slice(0, 16);
  }
  return `REF-${userPart}${randomPart}`;
}

// =============================================================================
// REFERRAL MANAGEMENT
// =============================================================================

export async function getOrCreateReferralCode(
  tenantId: string,
  userId: string
): Promise<string> {
  // Check for existing active referral code
  const existing = await prisma.referral.findFirst({
    where: {
      tenantId,
      referrerId: userId,
      referredId: null,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    select: { referralCode: true },
  });

  if (existing) return existing.referralCode;

  // Get tenant config
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { referralCodePrefix: true, referralExpiryDays: true, slug: true },
  });

  const code = await generateReferralCode(tenant?.referralCodePrefix ?? null, userId);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (tenant?.referralExpiryDays ?? 90));

  await prisma.referral.create({
    data: {
      tenantId,
      referrerId: userId,
      referralCode: code,
      status: "pending",
      expiresAt,
    },
  });

  return code;
}

export async function redeemReferralCode(
  tenantId: string,
  code: string,
  referredUserId: string,
  referredEmail: string
): Promise<{ success: boolean; error?: string }> {
  // Find the referral
  const referral = await prisma.referral.findFirst({
    where: {
      tenantId,
      referralCode: code,
      status: "pending",
      referredId: null,
    },
  });

  if (!referral) {
    return { success: false, error: "Invalid or expired referral code" };
  }

  if (referral.expiresAt && referral.expiresAt < new Date()) {
    return { success: false, error: "Referral code has expired" };
  }

  // Can't refer yourself
  if (referral.referrerId === referredUserId) {
    return { success: false, error: "Cannot use your own referral code" };
  }

  // Check if this user was already referred
  const alreadyReferred = await prisma.referral.findFirst({
    where: {
      tenantId,
      referredId: referredUserId,
      status: { in: ["signed_up", "completed", "rewarded"] },
    },
  });

  if (alreadyReferred) {
    return { success: false, error: "You have already been referred" };
  }

  // Mark as signed up
  await prisma.referral.update({
    where: { id: referral.id },
    data: {
      referredId: referredUserId,
      referredEmail: referredEmail,
      status: "signed_up",
      signedUpAt: new Date(),
    },
  });

  return { success: true };
}

export async function completeReferral(
  tenantId: string,
  referredUserId: string,
  orderId: string
): Promise<void> {
  // Get tenant referral config
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      referralEnabled: true,
      referralRewardAmount: true,
      referralRewardType: true,
      referralMinOrderValue: true,
    },
  });

  if (!tenant?.referralEnabled) return;

  // Find the signed_up referral for this user
  const referral = await prisma.referral.findFirst({
    where: {
      tenantId,
      referredId: referredUserId,
      status: "signed_up",
    },
    include: {
      referrer: { select: { id: true, email: true, firstName: true, walletBalance: true } },
    },
  });

  if (!referral) return;

  // Check minimum order value
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { totalAmount: true },
  });

  if (!order || order.totalAmount < tenant.referralMinOrderValue) return;

  // Mark referral as completed
  await prisma.referral.update({
    where: { id: referral.id },
    data: {
      status: "completed",
      completedAt: new Date(),
      referredOrderId: orderId,
    },
  });

  // Reward the referrer
  await rewardReferrer(tenantId, referral.id, referral.referrer, tenant.referralRewardAmount, tenant.referralRewardType);
}

async function rewardReferrer(
  tenantId: string,
  referralId: string,
  referrer: { id: string; email: string; firstName: string | null; walletBalance: number },
  rewardAmount: number,
  rewardType: string
): Promise<void> {
  if (rewardType === "credit") {
    // Add wallet credit
    const newBalance = referrer.walletBalance + rewardAmount;
    await prisma.$transaction([
      prisma.user.update({
        where: { id: referrer.id },
        data: { walletBalance: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          userId: referrer.id,
          tenantId,
          type: "promo_credit",
          amount: rewardAmount,
          balanceAfter: newBalance,
          description: `Referral reward - $${rewardAmount} credit`,
        },
      }),
      prisma.referral.update({
        where: { id: referralId },
        data: {
          status: "rewarded",
          rewardAmount,
          rewardType: "credit",
          rewardedAt: new Date(),
        },
      }),
    ]);
  } else {
    // Create promo code reward
    const promoCode = `REFBONUS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    await prisma.$transaction([
      prisma.promoCode.create({
        data: {
          tenantId,
          code: promoCode,
          description: `Referral reward for ${referrer.firstName ?? referrer.email}`,
          discountType: "flat_amount",
          discountValue: rewardAmount,
          maxUses: 1,
          maxUsesPerCustomer: 1,
          validFrom: new Date(),
          validUntil,
        },
      }),
      prisma.referral.update({
        where: { id: referralId },
        data: {
          status: "rewarded",
          rewardAmount,
          rewardType: "promo_code",
          rewardedAt: new Date(),
        },
      }),
    ]);
  }

  // Notify referrer
  sendNotification({
    tenantId,
    userId: referrer.id,
    event: "order_completed", // Reuse existing template
    channels: ["email"],
    recipientEmail: referrer.email,
    variables: {
      customerName: referrer.firstName ?? "Customer",
      orderNumber: "Referral Reward",
      total: `$${rewardAmount}`,
    },
  }).catch(console.error);
}

// =============================================================================
// STATS & QUERIES
// =============================================================================

export async function getReferralStats(tenantId: string): Promise<ReferralStats> {
  const referrals = await prisma.referral.findMany({
    where: { tenantId },
    select: { status: true, rewardAmount: true },
  });

  return {
    totalReferrals: referrals.length,
    pendingReferrals: referrals.filter((r) => r.status === "pending" || r.status === "signed_up").length,
    completedReferrals: referrals.filter((r) => r.status === "completed" || r.status === "rewarded").length,
    rewardedReferrals: referrals.filter((r) => r.status === "rewarded").length,
    totalRewardsGiven: referrals
      .filter((r) => r.status === "rewarded" && r.rewardAmount)
      .reduce((sum, r) => sum + (r.rewardAmount ?? 0), 0),
  };
}

export async function getCustomerReferralInfo(
  tenantId: string,
  userId: string
): Promise<CustomerReferralInfo> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true, referralEnabled: true },
  });

  const referralCode = await getOrCreateReferralCode(tenantId, userId);

  const referrals = await prisma.referral.findMany({
    where: { tenantId, referrerId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      referredEmail: true,
      status: true,
      rewardAmount: true,
      createdAt: true,
    },
  });

  const successfulReferrals = referrals.filter(
    (r) => r.status === "completed" || r.status === "rewarded"
  ).length;

  const totalEarned = referrals
    .filter((r) => r.status === "rewarded")
    .reduce((sum, r) => sum + (r.rewardAmount ?? 0), 0);

  const shareUrl = `https://${tenant?.slug ?? ""}.laundryshuttle.com/order?ref=${referralCode}`;

  return {
    referralCode,
    shareUrl,
    totalReferrals: referrals.length,
    successfulReferrals,
    totalEarned,
    referrals,
  };
}

export async function getReferralProgramConfig(tenantId: string): Promise<ReferralProgramConfig> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      referralEnabled: true,
      referralRewardAmount: true,
      referralRewardType: true,
      referralMinOrderValue: true,
      referralCodePrefix: true,
      referralExpiryDays: true,
    },
  });

  return {
    enabled: tenant?.referralEnabled ?? false,
    rewardAmount: tenant?.referralRewardAmount ?? 10,
    rewardType: tenant?.referralRewardType ?? "credit",
    minOrderValue: tenant?.referralMinOrderValue ?? 0,
    codePrefix: tenant?.referralCodePrefix ?? null,
    expiryDays: tenant?.referralExpiryDays ?? 90,
  };
}

export async function getTenantReferralLeaderboard(tenantId: string, limit = 10) {
  const referrals = await prisma.referral.groupBy({
    by: ["referrerId"],
    where: {
      tenantId,
      status: { in: ["completed", "rewarded"] },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  if (referrals.length === 0) return [];

  const userIds = referrals.map((r) => r.referrerId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  return referrals.map((r) => {
    const user = userMap.get(r.referrerId);
    return {
      userId: r.referrerId,
      name: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email : "Unknown",
      referralCount: r._count.id,
    };
  });
}
