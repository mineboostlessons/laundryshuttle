"use server";

import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import prisma from "@/lib/prisma";

export async function getPlatformReferralAnalytics() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const [
    totalReferrals,
    completedReferrals,
    rewardedReferrals,
    totalRewards,
    tenantsWithReferrals,
    recentReferrals,
  ] = await Promise.all([
    prisma.referral.count(),
    prisma.referral.count({ where: { status: { in: ["completed", "rewarded"] } } }),
    prisma.referral.count({ where: { status: "rewarded" } }),
    prisma.referral.aggregate({
      where: { status: "rewarded" },
      _sum: { rewardAmount: true },
    }),
    prisma.referral.groupBy({
      by: ["tenantId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),
    prisma.referral.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        tenant: { select: { businessName: true, slug: true } },
        referrer: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
  ]);

  // Get tenant names for the leaderboard
  const tenantIds = tenantsWithReferrals.map((t) => t.tenantId);
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, businessName: true, slug: true },
  });
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  const conversionRate =
    totalReferrals > 0
      ? ((completedReferrals / totalReferrals) * 100).toFixed(1)
      : "0";

  return {
    stats: {
      totalReferrals,
      completedReferrals,
      rewardedReferrals,
      totalRewardsGiven: totalRewards._sum.rewardAmount ?? 0,
      conversionRate,
      tenantsUsingReferrals: tenantsWithReferrals.length,
    },
    tenantLeaderboard: tenantsWithReferrals.map((t) => ({
      tenantId: t.tenantId,
      businessName: tenantMap.get(t.tenantId)?.businessName ?? "Unknown",
      slug: tenantMap.get(t.tenantId)?.slug ?? "",
      referralCount: t._count.id,
    })),
    recentReferrals: recentReferrals.map((r) => ({
      id: r.id,
      tenantName: r.tenant.businessName,
      referrerName:
        `${r.referrer.firstName ?? ""} ${r.referrer.lastName ?? ""}`.trim() ||
        r.referrer.email,
      referredEmail: r.referredEmail,
      status: r.status,
      rewardAmount: r.rewardAmount,
      createdAt: r.createdAt,
    })),
  };
}
