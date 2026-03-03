"use server";

import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import {
  getBenchmarkDashboard,
  generateBenchmarkSnapshot,
  type BenchmarkDashboard,
} from "@/lib/benchmarks";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const periodSchema = z.enum(["weekly", "monthly"]);

function validatePeriod(period: "weekly" | "monthly"): "weekly" | "monthly" {
  return periodSchema.parse(period);
}

export async function getBenchmarks(
  period: "weekly" | "monthly" = "monthly"
): Promise<BenchmarkDashboard> {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();
  period = validatePeriod(period);
  return getBenchmarkDashboard(tenant.id, period);
}

export async function refreshBenchmarks(period: "weekly" | "monthly" = "monthly") {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();
  period = validatePeriod(period);

  const now = new Date();
  let periodStart: Date;

  if (period === "weekly") {
    const dayOfWeek = now.getDay();
    periodStart = new Date(now);
    periodStart.setDate(now.getDate() - dayOfWeek);
    periodStart.setHours(0, 0, 0, 0);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  await generateBenchmarkSnapshot(tenant.id, period, periodStart, now);
  revalidatePath("/dashboard/benchmarks");
  return { success: true };
}
