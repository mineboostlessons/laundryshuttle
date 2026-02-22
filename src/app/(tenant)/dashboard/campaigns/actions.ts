"use server";

import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import {
  getWinBackCandidates,
  executeWinBackCampaign,
  getWinBackCampaignStats,
} from "@/lib/upsell";

export async function getWinBackData() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();
  return getWinBackCandidates(tenant.id);
}

export async function runWinBackCampaign(tier: "mild" | "moderate" | "urgent") {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();
  return executeWinBackCampaign(tenant.id, tier);
}

export async function getCampaignStats() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();
  return getWinBackCampaignStats(tenant.id);
}
