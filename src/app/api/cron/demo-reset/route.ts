import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Cron job: Reset demo tenants that have auto-reset enabled
// Should be called periodically (e.g., every hour via Vercel Cron)
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const demoTenants = await prisma.tenant.findMany({
    where: {
      isDemo: true,
      isActive: true,
      demoResetInterval: { not: null },
    },
    select: {
      id: true,
      slug: true,
      demoResetInterval: true,
    },
  });

  let resetCount = 0;

  for (const tenant of demoTenants) {
    if (!tenant.demoResetInterval) continue;

    // Check if last order is older than the reset interval
    const lastOrder = await prisma.order.findFirst({
      where: {
        tenantId: tenant.id,
        specialInstructions: { contains: "[SANDBOX]" },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const intervalMs = tenant.demoResetInterval * 60 * 60 * 1000;
    const shouldReset = lastOrder
      ? Date.now() - lastOrder.createdAt.getTime() > intervalMs
      : true;

    if (shouldReset) {
      // Clean up sandbox data
      const sandboxOrders = await prisma.order.findMany({
        where: {
          tenantId: tenant.id,
          specialInstructions: { contains: "[SANDBOX]" },
        },
        select: { id: true },
      });

      if (sandboxOrders.length > 0) {
        const orderIds = sandboxOrders.map((o) => o.id);
        await prisma.orderItem.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        await prisma.orderStatusHistory.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        await prisma.order.deleteMany({
          where: { id: { in: orderIds } },
        });
      }

      await prisma.user.deleteMany({
        where: {
          tenantId: tenant.id,
          email: { contains: "sandbox-" },
        },
      });

      // Clear expired demo sessions
      await prisma.demoSession.deleteMany({
        where: {
          tenantId: tenant.id,
          expiresAt: { lt: new Date() },
        },
      });

      resetCount++;
      console.log(`Reset demo tenant: ${tenant.slug}`);
    }
  }

  return NextResponse.json({
    success: true,
    tenantsChecked: demoTenants.length,
    tenantsReset: resetCount,
  });
}
