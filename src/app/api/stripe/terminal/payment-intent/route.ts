import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createTerminalPaymentIntent } from "@/lib/stripe-terminal";
import { UserRole } from "@/types";

const createPISchema = z.object({
  amount: z.number().positive(),
  orderId: z.string().optional(),
});

/**
 * POST /api/stripe/terminal/payment-intent
 * Creates a PaymentIntent for Stripe Terminal card_present processing.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const staffRoles: string[] = [
      UserRole.OWNER,
      UserRole.MANAGER,
      UserRole.ATTENDANT,
    ];
    if (!staffRoles.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    if (!session.user.tenantId) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: {
        stripeConnectAccountId: true,
        stripeConnectStatus: true,
        platformFeePercent: true,
      },
    });

    if (!tenant?.stripeConnectAccountId || tenant.stripeConnectStatus !== "active") {
      return NextResponse.json(
        { success: false, error: "Stripe Connect not active for this tenant" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = createPISchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { amount, orderId } = parsed.data;

    const paymentIntent = await createTerminalPaymentIntent({
      amount,
      connectedAccountId: tenant.stripeConnectAccountId,
      platformFeePercent: tenant.platformFeePercent,
      metadata: {
        tenantId: session.user.tenantId,
        ...(orderId && { orderId }),
        source: "pos_terminal",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    });
  } catch (error) {
    console.error("Terminal payment intent error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
