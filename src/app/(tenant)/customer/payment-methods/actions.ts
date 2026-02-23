"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function getPaymentMethods() {
  const session = await requireRole(UserRole.CUSTOMER);
  const tenant = await requireTenant();

  const methods = await prisma.customerPaymentMethod.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return methods;
}

export async function addPaymentMethod(stripePaymentMethodId: string) {
  const session = await requireRole(UserRole.CUSTOMER);
  const tenant = await requireTenant();

  const parsed = z.string().min(1).safeParse(stripePaymentMethodId);
  if (!parsed.success) {
    return { success: false, error: "Invalid payment method ID" };
  }

  // Fetch the tenant's connected account
  const tenantData = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: { stripeConnectAccountId: true },
  });

  if (!tenantData?.stripeConnectAccountId) {
    return { success: false, error: "Payments not set up for this business" };
  }

  try {
    // Retrieve payment method details from Stripe
    const pm = await stripe.paymentMethods.retrieve(stripePaymentMethodId, {
      stripeAccount: tenantData.stripeConnectAccountId,
    });

    if (!pm.card) {
      return { success: false, error: "Only card payment methods are supported" };
    }

    // Check if this card already exists
    const existing = await prisma.customerPaymentMethod.findFirst({
      where: {
        userId: session.user.id,
        cardLastFour: pm.card.last4,
        cardBrand: pm.card.brand,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      },
    });

    if (existing) {
      return { success: false, error: "This card is already saved" };
    }

    // Check if user has any methods; if not, this will be default
    const existingCount = await prisma.customerPaymentMethod.count({
      where: { userId: session.user.id },
    });

    await prisma.customerPaymentMethod.create({
      data: {
        userId: session.user.id,
        stripePaymentMethodId: pm.id,
        cardLastFour: pm.card.last4,
        cardBrand: pm.card.brand,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        isDefault: existingCount === 0,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Add payment method error:", error);
    return { success: false, error: "Failed to add payment method" };
  }
}

export async function setDefaultPaymentMethod(id: string) {
  const session = await requireRole(UserRole.CUSTOMER);

  const method = await prisma.customerPaymentMethod.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!method) {
    return { success: false, error: "Payment method not found" };
  }

  // Unset all defaults, then set the new one
  await prisma.$transaction([
    prisma.customerPaymentMethod.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    }),
    prisma.customerPaymentMethod.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);

  return { success: true };
}

export async function deletePaymentMethod(id: string) {
  const session = await requireRole(UserRole.CUSTOMER);

  const method = await prisma.customerPaymentMethod.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!method) {
    return { success: false, error: "Payment method not found" };
  }

  await prisma.customerPaymentMethod.delete({ where: { id } });

  // If we deleted the default, promote the most recent one
  if (method.isDefault) {
    const next = await prisma.customerPaymentMethod.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    if (next) {
      await prisma.customerPaymentMethod.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  return { success: true };
}
