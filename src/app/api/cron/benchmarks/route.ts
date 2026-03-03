import { NextRequest, NextResponse } from "next/server";
import { generateAllBenchmarkSnapshots } from "@/lib/benchmarks";

// POST /api/cron/benchmarks
// Called by Vercel cron or external scheduler to generate benchmark snapshots
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawPeriod = searchParams.get("period") ?? "daily";
  const validPeriods = ["daily", "weekly", "monthly"] as const;
  if (!validPeriods.includes(rawPeriod as (typeof validPeriods)[number])) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }
  const period = rawPeriod as "daily" | "weekly" | "monthly";

  const results = await generateAllBenchmarkSnapshots(period);

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    success: true,
    period,
    total: results.length,
    succeeded,
    failed,
  });
}
