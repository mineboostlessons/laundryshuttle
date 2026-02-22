import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case "account.updated":
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error handling event ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Handle wallet top-up
  if (paymentIntent.metadata?.type === "wallet_top_up") {
    const { creditWalletFromPayment } = await import(
      "@/app/(tenant)/customer/wallet/actions"
    );
    await creditWalletFromPayment({
      userId: paymentIntent.metadata.userId,
      tenantId: paymentIntent.metadata.tenantId,
      amount: parseFloat(paymentIntent.metadata.amount),
      stripePaymentIntentId: paymentIntent.id,
    });
    return;
  }

  const orderId = paymentIntent.metadata?.orderId;
  if (!orderId) return;

  const walletDeduction = parseFloat(paymentIntent.metadata?.walletDeduction ?? "0");

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, customerId: true, tenantId: true, orderNumber: true, paidAt: true },
    });

    if (!order || order.paidAt) return;

    // Mark order as paid
    await tx.order.update({
      where: { id: orderId },
      data: {
        paidAt: new Date(),
        status: "confirmed",
        paymentMethod: "card",
      },
    });

    // Add status history
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: "confirmed",
        notes: "Payment confirmed via Stripe",
      },
    });

    // Deduct wallet if used
    if (walletDeduction > 0 && order.customerId) {
      const user = await tx.user.findUnique({
        where: { id: order.customerId },
        select: { walletBalance: true },
      });

      if (user) {
        const newBalance = Math.max(0, user.walletBalance - walletDeduction);
        await tx.user.update({
          where: { id: order.customerId },
          data: { walletBalance: newBalance },
        });

        await tx.walletTransaction.create({
          data: {
            userId: order.customerId,
            tenantId: order.tenantId,
            type: "order_payment",
            amount: -walletDeduction,
            balanceAfter: newBalance,
            description: `Payment for order ${order.orderNumber}`,
            orderId: order.id,
          },
        });
      }
    }
  });
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId;
  if (!orderId) return;

  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      status: "payment_failed",
      notes: `Payment failed: ${paymentIntent.last_payment_error?.message ?? "Unknown error"}`,
    },
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
    select: { id: true, orderNumber: true },
  });

  if (!order) return;

  const refundedAmount = charge.amount_refunded / 100;
  const isFullRefund = charge.refunded;

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        status: isFullRefund ? "refunded" : "partially_refunded",
      },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: isFullRefund ? "refunded" : "partially_refunded",
        notes: `Refunded ${isFullRefund ? "full amount" : `$${refundedAmount.toFixed(2)}`}`,
      },
    }),
  ]);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const stripeSubId = subscription.id;

  const customerSub = await prisma.customerSubscription.findFirst({
    where: { stripeSubscriptionId: stripeSubId },
  });
  if (!customerSub) return;

  const statusMap: Record<string, string> = {
    active: "active",
    paused: "paused",
    canceled: "cancelled",
    past_due: "active",
    unpaid: "paused",
  };

  const newStatus = statusMap[subscription.status] ?? customerSub.status;

  await prisma.customerSubscription.update({
    where: { id: customerSub.id },
    data: {
      status: newStatus,
      cancelledAt: subscription.status === "canceled" ? new Date() : customerSub.cancelledAt,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const stripeSubId = subscription.id;

  const customerSub = await prisma.customerSubscription.findFirst({
    where: { stripeSubscriptionId: stripeSubId },
  });
  if (!customerSub) return;

  await prisma.customerSubscription.update({
    where: { id: customerSub.id },
    data: { status: "cancelled", cancelledAt: new Date() },
  });
}

async function handleAccountUpdated(account: Stripe.Account) {
  const tenantId = account.metadata?.tenantId;
  if (!tenantId) return;

  const status = account.charges_enabled
    ? "active"
    : account.details_submitted
      ? "restricted"
      : "pending";

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      stripeConnectStatus: status,
      stripeOnboardingComplete: account.details_submitted ?? false,
    },
  });
}
