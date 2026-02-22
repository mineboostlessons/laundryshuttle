"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";

/**
 * Get all tax reports across all tenants for a given year.
 * Platform admin only.
 */
export async function getAllTaxReports(taxYear: number) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const reports = await prisma.taxReport.findMany({
    where: { taxYear },
    orderBy: { grossPayments: "desc" },
  });

  return reports;
}

/**
 * Generate tax reports for all active tenants for a given year.
 * Platform admin only.
 */
export async function bulkGenerateTaxReports(taxYear: number) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: {
      id: true,
      businessName: true,
      platformFeePercent: true,
    },
  });

  const yearStart = new Date(taxYear, 0, 1);
  const yearEnd = new Date(taxYear + 1, 0, 1);
  const results: { tenantId: string; businessName: string; grossPayments: number }[] = [];

  for (const tenant of tenants) {
    const orders = await prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        paidAt: { gte: yearStart, lt: yearEnd },
        status: { not: "cancelled" },
      },
      select: { totalAmount: true, paidAt: true },
    });

    if (orders.length === 0) continue;

    const monthlyData: Record<number, { gross: number; transactions: number; refunds: number }> = {};
    for (let m = 1; m <= 12; m++) {
      monthlyData[m] = { gross: 0, transactions: 0, refunds: 0 };
    }

    let grossPayments = 0;
    for (const order of orders) {
      grossPayments += order.totalAmount;
      const month = order.paidAt!.getMonth() + 1;
      monthlyData[month].gross += order.totalAmount;
      monthlyData[month].transactions += 1;
    }

    const refundReports = await prisma.issueReport.findMany({
      where: {
        order: {
          tenantId: tenant.id,
          paidAt: { gte: yearStart, lt: yearEnd },
        },
        compensationType: { in: ["refund_full", "refund_partial"] },
        compensationAmount: { not: null },
      },
      select: { compensationAmount: true, resolvedAt: true },
    });

    let refundsAmount = 0;
    for (const report of refundReports) {
      refundsAmount += report.compensationAmount ?? 0;
      if (report.resolvedAt) {
        const month = report.resolvedAt.getMonth() + 1;
        monthlyData[month].refunds += report.compensationAmount ?? 0;
      }
    }

    const platformFeesAmount = grossPayments * (tenant.platformFeePercent ?? 0.01);
    const netPayments = grossPayments - refundsAmount;

    const monthlyBreakdown = Object.entries(monthlyData).map(([month, data]) => ({
      month: parseInt(month),
      gross: Math.round(data.gross * 100) / 100,
      transactions: data.transactions,
      refunds: Math.round(data.refunds * 100) / 100,
    }));

    await prisma.taxReport.upsert({
      where: {
        tenantId_taxYear: { tenantId: tenant.id, taxYear },
      },
      update: {
        grossPayments: Math.round(grossPayments * 100) / 100,
        totalTransactions: orders.length,
        refundsAmount: Math.round(refundsAmount * 100) / 100,
        netPayments: Math.round(netPayments * 100) / 100,
        platformFeesAmount: Math.round(platformFeesAmount * 100) / 100,
        stripePayoutsAmount: Math.round((netPayments - platformFeesAmount) * 100) / 100,
        monthlyBreakdown,
        businessName: tenant.businessName,
        status: "generated",
        generatedAt: new Date(),
      },
      create: {
        tenantId: tenant.id,
        taxYear,
        grossPayments: Math.round(grossPayments * 100) / 100,
        totalTransactions: orders.length,
        refundsAmount: Math.round(refundsAmount * 100) / 100,
        netPayments: Math.round(netPayments * 100) / 100,
        platformFeesAmount: Math.round(platformFeesAmount * 100) / 100,
        stripePayoutsAmount: Math.round((netPayments - platformFeesAmount) * 100) / 100,
        monthlyBreakdown,
        businessName: tenant.businessName,
        status: "generated",
        generatedAt: new Date(),
      },
    });

    results.push({
      tenantId: tenant.id,
      businessName: tenant.businessName,
      grossPayments: Math.round(grossPayments * 100) / 100,
    });
  }

  return results;
}

/**
 * Export all tax reports as CSV for a given year.
 */
export async function exportAllTaxReportsCsv(taxYear: number) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const reports = await prisma.taxReport.findMany({
    where: { taxYear },
    orderBy: { grossPayments: "desc" },
  });

  let csv = "1099-K Platform Report\n";
  csv += `Tax Year: ${taxYear}\n\n`;
  csv += "Business Name,EIN,Gross Payments,Transactions,Refunds,Net Payments,Platform Fees,Payouts,Status\n";

  for (const report of reports) {
    csv += `"${report.businessName}",${report.ein ?? "N/A"},${report.grossPayments.toFixed(2)},${report.totalTransactions},${report.refundsAmount.toFixed(2)},${report.netPayments.toFixed(2)},${report.platformFeesAmount.toFixed(2)},${report.stripePayoutsAmount.toFixed(2)},${report.status}\n`;
  }

  return csv;
}
