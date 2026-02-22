import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyDomainDns } from "@/lib/custom-domains";

/**
 * Cron job: Auto-verify pending custom domains.
 * Runs every 15 minutes via Vercel Cron.
 * Checks all pending domains and marks them verified if DNS is configured.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all pending verifications (limit to 20 per run to avoid timeouts)
    const pendingVerifications = await prisma.customDomainVerification.findMany({
      where: {
        status: "pending",
        checkCount: { lt: 100 }, // Give up after 100 checks
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    let verified = 0;
    let failed = 0;
    let checked = 0;

    for (const verification of pendingVerifications) {
      checked++;

      const result = await verifyDomainDns(
        verification.domain,
        verification.verificationToken
      );

      if (result.verified) {
        // Mark verified and assign to tenant
        await prisma.$transaction(async (tx) => {
          await tx.customDomainVerification.update({
            where: { id: verification.id },
            data: {
              status: "verified",
              verifiedAt: new Date(),
              lastCheckedAt: new Date(),
              verificationMethod: result.method,
              checkCount: { increment: 1 },
              failureReason: null,
            },
          });

          await tx.tenant.update({
            where: { id: verification.tenantId },
            data: { customDomain: verification.domain },
          });
        });

        verified++;
      } else {
        // Update check count and failure reason
        const newCheckCount = verification.checkCount + 1;
        await prisma.customDomainVerification.update({
          where: { id: verification.id },
          data: {
            lastCheckedAt: new Date(),
            checkCount: newCheckCount,
            failureReason: result.error,
            status: newCheckCount >= 100 ? "expired" : "pending",
          },
        });

        if (newCheckCount >= 100) {
          failed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked,
      verified,
      expired: failed,
      remaining: pendingVerifications.length - checked,
    });
  } catch (error) {
    console.error("Domain verification cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
