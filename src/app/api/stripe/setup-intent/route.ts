import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || session.user.role !== "customer") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find tenant's connected account
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { stripeConnectAccountId: true, stripeConnectStatus: true },
    });

    if (!tenant?.stripeConnectAccountId) {
      return NextResponse.json(
        { success: false, error: "Payments not set up for this business" },
        { status: 400 }
      );
    }

    // Ensure user has a Stripe customer on the connected account
    let stripeCustomerId = await prisma.user
      .findUnique({
        where: { id: session.user.id },
        select: { stripeCustomerId: true },
      })
      .then((u) => u?.stripeCustomerId);

    if (!stripeCustomerId) {
      // Create customer on the connected account (not the platform account)
      const customer = await stripe.customers.create(
        {
          email: session.user.email,
          name: session.user.name ?? undefined,
          metadata: { userId: session.user.id },
        },
        { stripeAccount: tenant.stripeConnectAccountId }
      );
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    // Create SetupIntent on the connected account
    const setupIntent = await stripe.setupIntents.create(
      {
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        metadata: {
          userId: session.user.id,
          tenantId: session.user.tenantId,
        },
      },
      {
        stripeAccount: tenant.stripeConnectAccountId,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: setupIntent.client_secret,
        stripeConnectAccountId: tenant.stripeConnectAccountId,
      },
    });
  } catch (error) {
    console.error("Setup intent error:", error);

    let message = "Failed to create setup intent";
    if (error instanceof Error) {
      message = error.message;
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
