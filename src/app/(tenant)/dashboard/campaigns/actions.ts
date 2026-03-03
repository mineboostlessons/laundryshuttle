"use server";

import { z } from "zod";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import {
  getWinBackCandidates,
  executeWinBackCampaign,
  getWinBackCampaignStats,
} from "@/lib/upsell";

const tierSchema = z.enum(["mild", "moderate", "urgent"]);

export async function getWinBackData() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();
  return getWinBackCandidates(tenant.id);
}

export async function runWinBackCampaign(tier: string) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();
  const parsed = tierSchema.safeParse(tier);
  if (!parsed.success) {
    return { created: 0, sent: 0, failed: 0, errors: ["Invalid campaign tier"] };
  }
  return executeWinBackCampaign(tenant.id, parsed.data);
}

export async function getCampaignStats() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();
  return getWinBackCampaignStats(tenant.id);
}
