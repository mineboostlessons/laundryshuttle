"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";

// =============================================================================
// Get Wallet Info
// =============================================================================

export async function getWalletInfo() {
  const session = await requireRole(UserRole.CUSTOMER);
  const tenant = await requireTenant();

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { walletBalance: true },
    }),
    prisma.walletTransaction.findMany({
      where: {
        userId: session.user.id,
        tenantId: tenant.id,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        description: true,
        orderId: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    balance: user?.walletBalance ?? 0,
    transactions,
  };
}

// =============================================================================
// Add Funds to Wallet (creates a payment intent)
// =============================================================================

const addFundsSchema = z.object({
  amount: z.number().min(5).max(500),
});

export async function addFundsToWallet(input: z.infer<typeof addFundsSchema>) {
  const session = await requireRole(UserRole.CUSTOMER);
  const tenant = await requireTenant();

  const parsed = addFundsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { amount } = parsed.data;

  // Get tenant's Connect account
  const tenantRecord = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      stripeConnectAccountId: true,
      stripeConnectStatus: true,
      platformFeePercent: true,
    },
  });

  if (
    !tenantRecord?.stripeConnectAccountId ||
    tenantRecord.stripeConnectStatus !== "active"
  ) {
    return { success: false, error: "This business cannot accept payments yet" };
  }

  // Dynamically import to avoid circular deps
  const { createPaymentIntent, createStripeCustomer } = await import("@/lib/stripe");

  // Ensure customer has Stripe ID
  let stripeCustomerId = await prisma.user
    .findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    })
    .then((u) => u?.stripeCustomerId);

  if (!stripeCustomerId) {
    const customer = await createStripeCustomer({
      email: session.user.email,
      name: session.user.name ?? undefined,
      metadata: { userId: session.user.id },
    });
    stripeCustomerId = customer.id;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { stripeCustomerId: customer.id },
    });
  }

  const paymentIntent = await createPaymentIntent({
    amount,
    connectedAccountId: tenantRecord.stripeConnectAccountId,
    platformFeePercent: tenantRecord.platformFeePercent,
    customerId: stripeCustomerId,
    metadata: {
      type: "wallet_top_up",
      userId: session.user.id,
      tenantId: tenant.id,
      amount: amount.toString(),
    },
  });

  return {
    success: true,
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

// =============================================================================
// Credit Wallet (called after successful payment webhook)
// =============================================================================

export async function creditWalletFromPayment(params: {
  userId: string;
  tenantId: string;
  amount: number;
  stripePaymentIntentId: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { walletBalance: true },
  });

  if (!user) return;

  const newBalance = user.walletBalance + params.amount;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: params.userId },
      data: { walletBalance: newBalance },
    }),
    prisma.walletTransaction.create({
      data: {
        userId: params.userId,
        tenantId: params.tenantId,
        type: "top_up",
        amount: params.amount,
        balanceAfter: newBalance,
        description: `Added ${params.amount.toFixed(2)} to wallet`,
        stripePaymentIntentId: params.stripePaymentIntentId,
      },
    }),
  ]);
}
