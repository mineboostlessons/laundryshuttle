import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Cron job: Mark overdue invoices and notify tenant owners.
 * Runs daily via Vercel Cron.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find sent invoices past their due date
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: "sent",
        dueDate: { lt: now },
      },
      include: {
        commercialAccount: {
          select: {
            companyName: true,
            tenantId: true,
          },
        },
      },
    });

    // Mark as overdue
    const updated = await prisma.invoice.updateMany({
      where: {
        id: { in: overdueInvoices.map((i) => i.id) },
      },
      data: { status: "overdue" },
    });

    return NextResponse.json({
      success: true,
      markedOverdue: updated.count,
    });
  } catch (error) {
    console.error("Invoice overdue cron failed:", error);
    return NextResponse.json(
      { error: "Failed to process overdue invoices" },
      { status: 500 }
    );
  }
}
