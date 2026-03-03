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
    try {
      // Use the actual Stripe amount (in cents) instead of trusting metadata
      const actualAmount = paymentIntent.amount / 100;
      const userId = paymentIntent.metadata.userId;
      const tenantId = paymentIntent.metadata.tenantId;

      // Verify the user belongs to the claimed tenant
      const user = await prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: { id: true },
      });
      if (!user) {
        console.error(
          `Wallet top-up: user ${userId} not found in tenant ${tenantId} for payment ${paymentIntent.id}`
        );
        return;
      }

      const { creditWalletFromPayment } = await import(
        "@/lib/wallet"
      );
      await creditWalletFromPayment({
        userId,
        tenantId,
        amount: actualAmount,
        stripePaymentIntentId: paymentIntent.id,
      });
    } catch (walletError) {
      const actualAmount = paymentIntent.amount / 100;
      console.error(
        `Wallet credit failed for payment ${paymentIntent.id} ` +
          `(user: ${paymentIntent.metadata.userId}, amount: ${actualAmount}):`,
        walletError
      );
      // Log for manual reconciliation — payment succeeded but wallet credit did not
      await prisma.walletTransaction.create({
        data: {
          userId: paymentIntent.metadata.userId,
          tenantId: paymentIntent.metadata.tenantId,
          type: "top_up_failed",
          amount: actualAmount,
          balanceAfter: 0,
          description: `FAILED wallet credit — manual reconciliation needed. PaymentIntent: ${paymentIntent.id}`,
          stripePaymentIntentId: paymentIntent.id,
        },
      });
    }
    return;
  }

  // Handle tip payments — update order totals after successful payment
  if (paymentIntent.metadata?.type === "tip") {
    const tipOrderId = paymentIntent.metadata.orderId;
    const tipAmount = paymentIntent.amount / 100;
    if (tipOrderId && tipAmount > 0) {
      await prisma.order.updateMany({
        where: { id: tipOrderId },
        data: {
          tipAmount: { increment: tipAmount },
          totalAmount: { increment: tipAmount },
        },
      });
    }
    return;
  }

  const orderId = paymentIntent.metadata?.orderId;
  if (!orderId) return;

  const rawWalletDeduction = parseFloat(paymentIntent.metadata?.walletDeduction ?? "0");
  // Cap wallet deduction to a sane maximum — the actual Stripe charge amount
  // prevents deducting more than the order total from a user's wallet.
  const stripeAmountDollars = paymentIntent.amount / 100;
  const walletDeduction = Math.max(0, Math.min(rawWalletDeduction, stripeAmountDollars));

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, customerId: true, tenantId: true, orderNumber: true, paidAt: true, promoCodeId: true, totalAmount: true },
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

    // Promo code usage already incremented atomically in the payment-intent route
    // to prevent TOCTOU race conditions — do NOT increment again here.

    // Deduct wallet if used (atomic decrement to prevent race conditions)
    // Additional safety: cap against the order's DB-recorded total
    const safeWalletDeduction = Math.min(walletDeduction, order.totalAmount);
    if (safeWalletDeduction > 0 && order.customerId) {
      const updatedUser = await tx.user.update({
        where: { id: order.customerId },
        data: { walletBalance: { decrement: safeWalletDeduction } },
        select: { walletBalance: true },
      });

      // Clamp to zero if balance went negative
      const finalBalance = Math.max(0, updatedUser.walletBalance);
      if (updatedUser.walletBalance < 0) {
        await tx.user.update({
          where: { id: order.customerId },
          data: { walletBalance: 0 },
        });
      }

      await tx.walletTransaction.create({
        data: {
          userId: order.customerId,
          tenantId: order.tenantId,
          type: "order_payment",
          amount: -safeWalletDeduction,
          balanceAfter: finalBalance,
          description: `Payment for order ${order.orderNumber}`,
          orderId: order.id,
        },
      });
    }
  });
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId;
  if (!orderId) return;

  // Decrement promo code usage — it was incremented atomically in the
  // payment-intent route, so we must reverse it on failure.
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { promoCodeId: true },
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      status: "payment_failed",
      notes: `Payment failed: ${paymentIntent.last_payment_error?.message ?? "Unknown error"}`,
    },
  });

  if (order?.promoCodeId) {
    await prisma.promoCode.updateMany({
      where: { id: order.promoCodeId, currentUses: { gt: 0 } },
      data: { currentUses: { decrement: 1 } },
    });
  }
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

  // Use updateMany to gracefully handle non-existent tenants (no throw)
  await prisma.tenant.updateMany({
    where: { id: tenantId },
    data: {
      stripeConnectStatus: status,
      stripeOnboardingComplete: account.details_submitted ?? false,
    },
  });
}
