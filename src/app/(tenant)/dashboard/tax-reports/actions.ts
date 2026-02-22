"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";

/**
 * Get or generate a tax report for a given year.
 */
export async function getTaxReport(taxYear: number) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  // Check if report already exists
  const existing = await prisma.taxReport.findUnique({
    where: {
      tenantId_taxYear: { tenantId: tenant.id, taxYear },
    },
  });

  if (existing) return existing;
  return null;
}

/**
 * Generate a 1099-K tax report by aggregating payment data for a year.
 */
export async function generateTaxReport(taxYear: number) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const yearStart = new Date(taxYear, 0, 1);
  const yearEnd = new Date(taxYear + 1, 0, 1);

  // Aggregate order data for the year
  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      paidAt: { gte: yearStart, lt: yearEnd },
      status: { not: "cancelled" },
    },
    select: {
      totalAmount: true,
      discountAmount: true,
      paidAt: true,
      stripePaymentIntentId: true,
    },
  });

  // Calculate monthly breakdown
  const monthlyData: Record<
    number,
    { gross: number; transactions: number; refunds: number }
  > = {};

  for (let m = 0; m < 12; m++) {
    monthlyData[m + 1] = { gross: 0, transactions: 0, refunds: 0 };
  }

  let grossPayments = 0;
  let totalTransactions = 0;

  for (const order of orders) {
    const month = order.paidAt!.getMonth() + 1;
    const amount = order.totalAmount;

    grossPayments += amount;
    totalTransactions += 1;

    monthlyData[month].gross += amount;
    monthlyData[month].transactions += 1;
  }

  // Get refund data (from issue reports with refund compensation)
  const refundReports = await prisma.issueReport.findMany({
    where: {
      order: {
        tenantId: tenant.id,
        paidAt: { gte: yearStart, lt: yearEnd },
      },
      compensationType: { in: ["refund_full", "refund_partial"] },
      compensationAmount: { not: null },
    },
    select: {
      compensationAmount: true,
      resolvedAt: true,
    },
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
  const stripePayoutsAmount = netPayments - platformFeesAmount;

  const monthlyBreakdown = Object.entries(monthlyData).map(([month, data]) => ({
    month: parseInt(month),
    gross: Math.round(data.gross * 100) / 100,
    transactions: data.transactions,
    refunds: Math.round(data.refunds * 100) / 100,
  }));

  // Upsert the tax report
  const report = await prisma.taxReport.upsert({
    where: {
      tenantId_taxYear: { tenantId: tenant.id, taxYear },
    },
    update: {
      grossPayments: Math.round(grossPayments * 100) / 100,
      totalTransactions,
      refundsAmount: Math.round(refundsAmount * 100) / 100,
      netPayments: Math.round(netPayments * 100) / 100,
      platformFeesAmount: Math.round(platformFeesAmount * 100) / 100,
      stripePayoutsAmount: Math.round(stripePayoutsAmount * 100) / 100,
      monthlyBreakdown,
      businessName: tenant.businessName,
      status: "generated",
      generatedAt: new Date(),
    },
    create: {
      tenantId: tenant.id,
      taxYear,
      grossPayments: Math.round(grossPayments * 100) / 100,
      totalTransactions,
      refundsAmount: Math.round(refundsAmount * 100) / 100,
      netPayments: Math.round(netPayments * 100) / 100,
      platformFeesAmount: Math.round(platformFeesAmount * 100) / 100,
      stripePayoutsAmount: Math.round(stripePayoutsAmount * 100) / 100,
      monthlyBreakdown,
      businessName: tenant.businessName,
      status: "generated",
      generatedAt: new Date(),
    },
  });

  return report;
}

/**
 * Export tax report data as CSV-formatted string.
 */
export async function exportTaxReportCsv(taxYear: number) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const report = await prisma.taxReport.findUnique({
    where: {
      tenantId_taxYear: { tenantId: tenant.id, taxYear },
    },
  });

  if (!report) throw new Error("No report found for this year");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const monthly = (report.monthlyBreakdown as { month: number; gross: number; transactions: number; refunds: number }[]) ?? [];

  let csv = "1099-K Tax Summary Report\n";
  csv += `Business: ${report.businessName}\n`;
  csv += `Tax Year: ${report.taxYear}\n\n`;
  csv += "Month,Gross Payments,Transactions,Refunds\n";

  for (const row of monthly) {
    csv += `${monthNames[row.month - 1]},${row.gross.toFixed(2)},${row.transactions},${row.refunds.toFixed(2)}\n`;
  }

  csv += `\nTotals\n`;
  csv += `Gross Payments,${report.grossPayments.toFixed(2)}\n`;
  csv += `Total Transactions,${report.totalTransactions}\n`;
  csv += `Refunds,${report.refundsAmount.toFixed(2)}\n`;
  csv += `Net Payments,${report.netPayments.toFixed(2)}\n`;
  csv += `Platform Fees,${report.platformFeesAmount.toFixed(2)}\n`;
  csv += `Stripe Payouts,${report.stripePayoutsAmount.toFixed(2)}\n`;

  return csv;
}

/**
 * Get all available tax years for this tenant (years with paid orders).
 */
export async function getAvailableTaxYears() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const currentYear = new Date().getFullYear();
  const years: number[] = [];

  // Check last 5 years
  for (let year = currentYear; year >= currentYear - 4; year--) {
    const count = await prisma.order.count({
      where: {
        tenantId: tenant.id,
        paidAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    });
    if (count > 0) years.push(year);
  }

  // Always include current year
  if (!years.includes(currentYear)) years.unshift(currentYear);

  return years;
}
