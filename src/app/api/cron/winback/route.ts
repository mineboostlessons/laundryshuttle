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

    for (const tenant of tenants) {
      const mild = await executeWinBackCampaign(tenant.id, "mild");
      const moderate = await executeWinBackCampaign(tenant.id, "moderate");
      const urgent = await executeWinBackCampaign(tenant.id, "urgent");

      results.push({
        tenantId: tenant.id,
        businessName: tenant.businessName,
        mild: { created: mild.created, sent: mild.sent },
        moderate: { created: moderate.created, sent: moderate.sent },
        urgent: { created: urgent.created, sent: urgent.sent },
      });
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
