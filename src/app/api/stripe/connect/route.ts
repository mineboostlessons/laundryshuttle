import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  createConnectAccount,
  createAccountLink,
  getConnectAccount,
  createDashboardLink,
} from "@/lib/stripe";

// =============================================================================
// POST /api/stripe/connect — Create or resume Connect onboarding
// =============================================================================

const connectSchema = z.object({
  action: z.enum(["create_account", "create_account_link", "dashboard_link"]),
  tenantId: z.string(),
  returnUrl: z.string().url().optional(),
  refreshUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["owner", "platform_admin"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = connectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { action, tenantId, returnUrl, refreshUrl } = parsed.data;

    // Verify user owns this tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        businessName: true,
        email: true,
        stripeConnectAccountId: true,
        stripeConnectStatus: true,
        stripeOnboardingComplete: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 }
      );
    }

    if (session.user.role === "owner" && session.user.tenantId !== tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // --- Create Account ---
    if (action === "create_account") {
      if (tenant.stripeConnectAccountId) {
        return NextResponse.json(
          { success: false, error: "Connect account already exists" },
          { status: 400 }
        );
      }

      const account = await createConnectAccount({
        email: tenant.email ?? session.user.email,
        businessName: tenant.businessName,
        tenantId: tenant.id,
      });

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          stripeConnectAccountId: account.id,
          stripeConnectStatus: "pending",
        },
      });

      // Create the onboarding link right away
      const baseUrl = returnUrl
        ? new URL(returnUrl).origin
        : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      const accountLink = await createAccountLink({
        accountId: account.id,
        returnUrl: returnUrl ?? `${baseUrl}/settings/payments?status=complete`,
        refreshUrl: refreshUrl ?? `${baseUrl}/settings/payments?status=refresh`,
      });

      return NextResponse.json({
        success: true,
        data: {
          accountId: account.id,
          onboardingUrl: accountLink.url,
        },
      });
    }

    // --- Create Account Link (resume onboarding) ---
    if (action === "create_account_link") {
      if (!tenant.stripeConnectAccountId) {
        return NextResponse.json(
          { success: false, error: "No Connect account found. Create one first." },
          { status: 400 }
        );
      }

      const baseUrl = returnUrl
        ? new URL(returnUrl).origin
        : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      const accountLink = await createAccountLink({
        accountId: tenant.stripeConnectAccountId,
        returnUrl: returnUrl ?? `${baseUrl}/settings/payments?status=complete`,
        refreshUrl: refreshUrl ?? `${baseUrl}/settings/payments?status=refresh`,
      });

      return NextResponse.json({
        success: true,
        data: { onboardingUrl: accountLink.url },
      });
    }

    // --- Dashboard Link ---
    if (action === "dashboard_link") {
      if (!tenant.stripeConnectAccountId) {
        return NextResponse.json(
          { success: false, error: "No Connect account found" },
          { status: 400 }
        );
      }

      const link = await createDashboardLink(tenant.stripeConnectAccountId);

      return NextResponse.json({
        success: true,
        data: { dashboardUrl: link.url },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Stripe Connect error:", error);

    let message = "Internal server error";
    if (error instanceof Error) {
      message = error.message;
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/stripe/connect?tenantId=xxx — Get Connect account status
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["owner", "platform_admin"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const tenantId = req.nextUrl.searchParams.get("tenantId");
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "tenantId is required" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        stripeConnectAccountId: true,
        stripeConnectStatus: true,
        stripeOnboardingComplete: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 }
      );
    }

    let stripeAccount: {
      chargesEnabled: boolean;
      payoutsEnabled: boolean;
      detailsSubmitted: boolean;
    } | null = null;

    if (tenant.stripeConnectAccountId) {
      const account = await getConnectAccount(tenant.stripeConnectAccountId);
      stripeAccount = {
        chargesEnabled: account.charges_enabled ?? false,
        payoutsEnabled: account.payouts_enabled ?? false,
        detailsSubmitted: account.details_submitted ?? false,
      };

      // Sync status
      const newStatus = account.charges_enabled
        ? "active"
        : account.details_submitted
          ? "restricted"
          : "pending";
      const onboardingComplete = account.details_submitted ?? false;

      if (
        newStatus !== tenant.stripeConnectStatus ||
        onboardingComplete !== tenant.stripeOnboardingComplete
      ) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            stripeConnectStatus: newStatus,
            stripeOnboardingComplete: onboardingComplete,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        accountId: tenant.stripeConnectAccountId,
        status: tenant.stripeConnectStatus,
        onboardingComplete: tenant.stripeOnboardingComplete,
        stripeAccount,
      },
    });
  } catch (error) {
    console.error("Stripe Connect status error:", error);

    let message = "Internal server error";
    if (error instanceof Error) {
      message = error.message;
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
