import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";

const validateSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().min(0),
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

    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { code, subtotal } = parsed.data;

    const promo = await prisma.promoCode.findUnique({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: code.toUpperCase(),
        },
      },
    });

    if (!promo || !promo.isActive) {
      return NextResponse.json({
        success: true,
        data: { valid: false, message: "Invalid promo code" },
      });
    }

    const now = new Date();

    if (now < promo.validFrom) {
      return NextResponse.json({
        success: true,
        data: { valid: false, message: "This promo code is not yet active" },
      });
    }

    if (promo.validUntil && now > promo.validUntil) {
      return NextResponse.json({
        success: true,
        data: { valid: false, message: "This promo code has expired" },
      });
    }

    if (promo.maxUses && promo.currentUses >= promo.maxUses) {
      return NextResponse.json({
        success: true,
        data: { valid: false, message: "This promo code has reached its usage limit" },
      });
    }

    if (promo.minOrderAmount && subtotal < promo.minOrderAmount) {
      return NextResponse.json({
        success: true,
        data: {
          valid: false,
          message: `Minimum order of $${promo.minOrderAmount.toFixed(2)} required`,
        },
      });
    }

    // Check per-customer usage limit
    if (promo.maxUsesPerCustomer) {
      const customerUses = await prisma.order.count({
        where: {
          customerId: session.user.id,
          promoCodeId: promo.id,
          paidAt: { not: null },
        },
      });

      if (customerUses >= promo.maxUsesPerCustomer) {
        return NextResponse.json({
          success: true,
          data: { valid: false, message: "You have already used this promo code" },
        });
      }
    }

    // Calculate discount
    let discount = 0;
    let message = "";

    switch (promo.discountType) {
      case "percentage":
        discount = subtotal * (promo.discountValue / 100);
        message = `${promo.discountValue}% off applied`;
        break;
      case "flat_amount":
        discount = Math.min(promo.discountValue, subtotal);
        message = `$${promo.discountValue.toFixed(2)} off applied`;
        break;
      case "free_delivery":
        discount = 0; // Delivery fee handled at payment time
        message = "Free delivery applied";
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        discount,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        message,
        description: promo.description,
      },
    });
  } catch (error) {
    console.error("Promo validation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
