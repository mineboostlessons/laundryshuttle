"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  generateTaxReport,
  getTaxReport,
  exportTaxReportCsv,
} from "./actions";
import {
  FileText,
  Download,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Receipt,
  ArrowDownRight,
} from "lucide-react";

interface TaxReport {
  id: string;
  taxYear: number;
  grossPayments: number;
  totalTransactions: number;
  refundsAmount: number;
  adjustmentsAmount: number;
  netPayments: number;
  platformFeesAmount: number;
  stripePayoutsAmount: number;
  monthlyBreakdown: { month: number; gross: number; transactions: number; refunds: number }[] | null;
  businessName: string;
  status: string;
  generatedAt: string | Date | null;
}

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function TaxReportsView({
  initialReport,
  availableYears,
  currentYear,
}: {
  initialReport: TaxReport | null;
  availableYears: number[];
  currentYear: number;
}) {
  const [report, setReport] = useState(initialReport);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [isPending, startTransition] = useTransition();

  function handleYearChange(year: string) {
    setSelectedYear(year);
    startTransition(async () => {
      const data = await getTaxReport(parseInt(year));
      setReport(data as TaxReport | null);
    });
  }

  function handleGenerate() {
    startTransition(async () => {
      const data = await generateTaxReport(parseInt(selectedYear));
      setReport(data as TaxReport);
    });
  }

  function handleExport() {
    startTransition(async () => {
      const csv = await exportTaxReportCsv(parseInt(selectedYear));
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `1099k-${selectedYear}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    generated: "Generated",
    filed: "Filed",
    corrected: "Corrected",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">1099-K Tax Reports</h1>
          <p className="text-muted-foreground">
            Annual payment volume summaries for tax reporting
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear} onValueChange={handleYearChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
            {report ? "Regenerate" : "Generate"}
          </Button>
          {report && (
            <Button variant="outline" onClick={handleExport} disabled={isPending}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {!report ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No report for {selectedYear}</p>
          <p className="text-sm mb-4">
            Generate a report to see your annual payment summary
          </p>
          <Button onClick={handleGenerate} disabled={isPending}>
            Generate {selectedYear} Report
          </Button>
        </div>
      ) : (
        <>
          {/* Status */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={report.status === "filed" ? "default" : "secondary"}>
              {statusLabels[report.status] ?? report.status}
            </Badge>
            {report.generatedAt && (
              <span>
                Generated: {new Date(report.generatedAt).toLocaleString()}
              </span>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Gross Payments
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency(report.grossPayments)}
              </p>
              <p className="text-xs text-muted-foreground">
                {report.totalTransactions.toLocaleString()} transactions
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <ArrowDownRight className="h-4 w-4" />
                Refunds
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(report.refundsAmount)}
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                Net Payments
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(report.netPayments)}
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Receipt className="h-4 w-4" />
                Platform Fees
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency(report.platformFeesAmount)}
              </p>
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          <div className="border rounded-lg">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Monthly Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3">Month</th>
                    <th className="text-right p-3">Gross Payments</th>
                    <th className="text-right p-3">Transactions</th>
                    <th className="text-right p-3">Refunds</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.monthlyBreakdown ?? []).map((row) => (
                    <tr key={row.month} className="border-b">
                      <td className="p-3">{monthNames[row.month - 1]}</td>
                      <td className="text-right p-3">
                        {formatCurrency(row.gross)}
                      </td>
                      <td className="text-right p-3">{row.transactions}</td>
                      <td className="text-right p-3 text-red-600">
                        {row.refunds > 0
                          ? formatCurrency(row.refunds)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold bg-muted/50">
                    <td className="p-3">Total</td>
                    <td className="text-right p-3">
                      {formatCurrency(report.grossPayments)}
                    </td>
                    <td className="text-right p-3">
                      {report.totalTransactions}
                    </td>
                    <td className="text-right p-3 text-red-600">
                      {formatCurrency(report.refundsAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 1099-K Threshold Notice */}
          <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
            <h3 className="font-medium mb-1">1099-K Reporting Threshold</h3>
            <p className="text-sm text-muted-foreground">
              For tax year {report.taxYear}, payment processors must file Form
              1099-K for merchants with gross payments exceeding $600.{" "}
              {report.grossPayments > 600 ? (
                <span className="text-orange-600 font-medium">
                  Your gross payments ({formatCurrency(report.grossPayments)})
                  exceed this threshold.
                </span>
              ) : (
                <span className="text-green-600 font-medium">
                  Your gross payments are below the threshold.
                </span>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
