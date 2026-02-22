"use server";

import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  getReferralStats,
  getReferralProgramConfig,
  getTenantReferralLeaderboard,
  type ReferralStats,
  type ReferralProgramConfig,
} from "@/lib/referrals";

export interface ReferralDashboardData {
  config: ReferralProgramConfig;
  stats: ReferralStats;
  leaderboard: { userId: string; name: string; referralCount: number }[];
  recentReferrals: {
    id: string;
    referrerName: string;
    referredEmail: string | null;
    status: string;
    rewardAmount: number | null;
    createdAt: Date;
  }[];
}

export async function getReferralDashboard(): Promise<ReferralDashboardData> {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const [config, stats, leaderboard, recentReferrals] = await Promise.all([
    getReferralProgramConfig(tenant.id),
    getReferralStats(tenant.id),
    getTenantReferralLeaderboard(tenant.id, 10),
    prisma.referral.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        referrer: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
  ]);

  return {
    config,
    stats,
    leaderboard,
    recentReferrals: recentReferrals.map((r) => ({
      id: r.id,
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

const updateConfigSchema = z.object({
  enabled: z.coerce.boolean(),
  rewardAmount: z.coerce.number().min(0).max(1000),
  rewardType: z.enum(["credit", "promo_code"]),
  minOrderValue: z.coerce.number().min(0),
  codePrefix: z.string().max(10).optional(),
  expiryDays: z.coerce.number().min(1).max(365),
});

export async function updateReferralConfig(
  _prev: { success: boolean; error?: string },
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const raw = Object.fromEntries(formData.entries());
  raw.enabled = formData.get("enabled") === "on" ? "true" : "false";

  const parsed = updateConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      referralEnabled: parsed.data.enabled,
      referralRewardAmount: parsed.data.rewardAmount,
      referralRewardType: parsed.data.rewardType,
      referralMinOrderValue: parsed.data.minOrderValue,
      referralCodePrefix: parsed.data.codePrefix || null,
      referralExpiryDays: parsed.data.expiryDays,
    },
  });

  revalidatePath("/dashboard/referrals");
  return { success: true };
}
