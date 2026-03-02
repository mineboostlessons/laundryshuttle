import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { executeWinBackCampaign } from "@/lib/upsell";

/**
 * GET /api/cron/winback
 * Automated daily win-back campaign execution.
 * Should be called by Vercel Cron or similar scheduler.
 * Protected by CRON_SECRET header.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true, onboardingComplete: true },
      select: { id: true, businessName: true },
    });

    const results: Array<{
      tenantId: string;
      businessName: string;
      mild: { created: number; sent: number };
      moderate: { created: number; sent: number };
      urgent: { created: number; sent: number };
    }> = [];

    // Process tenants in parallel batches of 5 for better performance
    const BATCH_SIZE = 5;
    for (let i = 0; i < tenants.length; i += BATCH_SIZE) {
      const batch = tenants.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (tenant) => {
          const [mild, moderate, urgent] = await Promise.all([
            executeWinBackCampaign(tenant.id, "mild"),
            executeWinBackCampaign(tenant.id, "moderate"),
            executeWinBackCampaign(tenant.id, "urgent"),
          ]);
          return {
            tenantId: tenant.id,
            businessName: tenant.businessName,
            mild: { created: mild.created, sent: mild.sent },
            moderate: { created: moderate.created, sent: moderate.sent },
            urgent: { created: urgent.created, sent: urgent.sent },
          };
        })
      );
      for (const outcome of batchResults) {
        if (outcome.status === "fulfilled") {
          results.push(outcome.value);
        }
      }
    }

    return NextResponse.json({
      success: true,
      tenantsProcessed: tenants.length,
      results,
    });
  } catch (error) {
    console.error("Win-back cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
