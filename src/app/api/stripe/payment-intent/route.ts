import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createPaymentIntent, createStripeCustomer } from "@/lib/stripe";

const createPaymentIntentSchema = z.object({
  orderId: z.string(),
  paymentMethodId: z.string().optional(),
  useWallet: z.boolean().optional(),
  promoCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = createPaymentIntentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { orderId, useWallet, promoCode } = parsed.data;

    // Fetch order with tenant info
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tenant: {
          select: {
            stripeConnectAccountId: true,
            stripeConnectStatus: true,
            platformFeePercent: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.customerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (order.paidAt) {
      return NextResponse.json(
        { success: false, error: "Order already paid" },
        { status: 400 }
      );
    }

    if (!order.tenant.stripeConnectAccountId || order.tenant.stripeConnectStatus !== "active") {
      return NextResponse.json(
        { success: false, error: "This business cannot accept payments yet" },
        { status: 400 }
      );
    }

    // Calculate amounts
    let totalAmount = order.totalAmount;
    let discountAmount = 0;

    // Apply promo code if provided
    if (promoCode) {
      const promo = await prisma.promoCode.findUnique({
        where: {
          tenantId_code: {
            tenantId: order.tenantId,
            code: promoCode.toUpperCase(),
          },
        },
      });

      if (promo && promo.isActive) {
        const now = new Date();
        const isValid =
          now >= promo.validFrom &&
          (!promo.validUntil || now <= promo.validUntil) &&
          (!promo.maxUses || promo.currentUses < promo.maxUses) &&
          (!promo.minOrderAmount || order.subtotal >= promo.minOrderAmount);

        if (isValid) {
          if (promo.discountType === "percentage") {
            discountAmount = order.subtotal * (promo.discountValue / 100);
          } else if (promo.discountType === "flat_amount") {
            discountAmount = promo.discountValue;
          } else if (promo.discountType === "free_delivery") {
            discountAmount = order.deliveryFee;
          }

          discountAmount = Math.min(discountAmount, totalAmount);
          totalAmount = totalAmount - discountAmount;

          // Update order with promo
          await prisma.$transaction([
            prisma.order.update({
              where: { id: orderId },
              data: {
                promoCodeId: promo.id,
                discountAmount,
                totalAmount,
              },
            }),
            prisma.promoCode.update({
              where: { id: promo.id },
              data: { currentUses: { increment: 1 } },
            }),
          ]);
        }
      }
    }

    // Apply wallet balance if requested
    let walletDeduction = 0;
    if (useWallet) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { walletBalance: true },
      });

      if (user && user.walletBalance > 0) {
        walletDeduction = Math.min(user.walletBalance, totalAmount);
        totalAmount = totalAmount - walletDeduction;
      }
    }

    // If fully covered by wallet, skip Stripe
    if (totalAmount <= 0) {
      await prisma.$transaction([
        prisma.order.update({
          where: { id: orderId },
          data: {
            paymentMethod: "wallet",
            paidAt: new Date(),
            status: "confirmed",
            totalAmount: order.totalAmount - discountAmount,
          },
        }),
        prisma.user.update({
          where: { id: session.user.id },
          data: { walletBalance: { decrement: walletDeduction } },
        }),
        prisma.walletTransaction.create({
          data: {
            userId: session.user.id,
            tenantId: order.tenantId,
            type: "order_payment",
            amount: -walletDeduction,
            balanceAfter: 0,
            description: `Payment for order ${order.orderNumber}`,
            orderId: order.id,
          },
        }),
        prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "confirmed",
            changedByUserId: session.user.id,
            notes: "Paid with wallet balance",
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: { paidWithWallet: true, orderId: order.id },
      });
    }

    // Ensure user has a Stripe customer ID
    let stripeCustomerId = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    }).then((u) => u?.stripeCustomerId);

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

    // Create payment intent with destination charge
    const paymentIntent = await createPaymentIntent({
      amount: totalAmount,
      connectedAccountId: order.tenant.stripeConnectAccountId,
      platformFeePercent: order.tenant.platformFeePercent,
      customerId: stripeCustomerId,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tenantId: order.tenantId,
        walletDeduction: walletDeduction.toString(),
      },
    });

    // Store the payment intent ID on the order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        paymentMethod: "card",
        totalAmount: order.totalAmount - discountAmount,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        walletDeduction,
      },
    });
  } catch (error) {
    console.error("Payment intent error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
