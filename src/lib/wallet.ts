import prisma from "@/lib/prisma";

/**
 * Credit a user's wallet after a successful payment.
 * This is an internal utility — NOT a server action.
 * Called from webhook handlers only.
 */
export async function creditWalletFromPayment(params: {
  userId: string;
  tenantId: string;
  amount: number;
  stripePaymentIntentId: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true },
  });

  if (!user) return;

  // Idempotency check — prevent duplicate credits from duplicate webhook deliveries
  const existingCredit = await prisma.walletTransaction.findFirst({
    where: {
      stripePaymentIntentId: params.stripePaymentIntentId,
      type: "top_up",
    },
  });
  if (existingCredit) return; // Already credited

  // Use atomic increment to prevent race conditions with concurrent top-ups
  const updated = await prisma.user.update({
    where: { id: params.userId },
    data: { walletBalance: { increment: params.amount } },
    select: { walletBalance: true },
  });

  await prisma.walletTransaction.create({
    data: {
      userId: params.userId,
      tenantId: params.tenantId,
      type: "top_up",
      amount: params.amount,
      balanceAfter: updated.walletBalance,
      description: `Added ${params.amount.toFixed(2)} to wallet`,
      stripePaymentIntentId: params.stripePaymentIntentId,
    },
  });
}
