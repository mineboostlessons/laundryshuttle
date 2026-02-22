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
  bulkGenerateTaxReports,
  getAllTaxReports,
  exportAllTaxReportsCsv,
} from "./actions";
import { FileText, Download, RefreshCw } from "lucide-react";

interface TaxReport {
  id: string;
  tenantId: string;
  taxYear: number;
  grossPayments: number;
  totalTransactions: number;
  refundsAmount: number;
  netPayments: number;
  platformFeesAmount: number;
  stripePayoutsAmount: number;
  businessName: string;
  ein: string | null;
  status: string;
  generatedAt: string | Date | null;
}

export function AdminTaxReportsView({
  initialReports,
  currentYear,
}: {
  initialReports: TaxReport[];
  currentYear: number;
}) {
  const [reports, setReports] = useState(initialReports);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [isPending, startTransition] = useTransition();
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  function handleYearChange(year: string) {
    setSelectedYear(year);
    setGeneratedCount(null);
    startTransition(async () => {
      const data = await getAllTaxReports(parseInt(year));
      setReports(data as TaxReport[]);
    });
  }

  function handleBulkGenerate() {
    startTransition(async () => {
      const results = await bulkGenerateTaxReports(parseInt(selectedYear));
      setGeneratedCount(results.length);
      const data = await getAllTaxReports(parseInt(selectedYear));
      setReports(data as TaxReport[]);
    });
  }

  function handleExport() {
    startTransition(async () => {
      const csv = await exportAllTaxReportsCsv(parseInt(selectedYear));
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `1099k-all-tenants-${selectedYear}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const totalGross = reports.reduce((sum, r) => sum + r.grossPayments, 0);
  const totalPlatformFees = reports.reduce((sum, r) => sum + r.platformFeesAmount, 0);
  const above600 = reports.filter((r) => r.grossPayments > 600).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">1099-K Tax Reports</h1>
          <p className="text-muted-foreground">
            Bulk 1099-K generation across all tenants
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear} onValueChange={handleYearChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleBulkGenerate} disabled={isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
            Generate All
          </Button>
          {reports.length > 0 && (
            <Button variant="outline" onClick={handleExport} disabled={isPending}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {generatedCount !== null && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          Generated reports for {generatedCount} tenants.
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Tenants with Reports</p>
          <p className="text-2xl font-bold">{reports.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Above $600 Threshold</p>
          <p className="text-2xl font-bold text-orange-600">{above600}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Gross Volume</p>
          <p className="text-2xl font-bold">{formatCurrency(totalGross)}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Platform Fees</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalPlatformFees)}
          </p>
        </div>
      </div>

      {/* Table */}
      {reports.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No tax reports for {selectedYear}. Click "Generate All" to create them.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3">Business</th>
                <th className="text-left p-3">EIN</th>
                <th className="text-right p-3">Gross</th>
                <th className="text-right p-3">Txns</th>
                <th className="text-right p-3">Refunds</th>
                <th className="text-right p-3">Net</th>
                <th className="text-right p-3">Platform Fee</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b">
                  <td className="p-3 font-medium">{report.businessName}</td>
                  <td className="p-3 text-muted-foreground">{report.ein ?? "-"}</td>
                  <td className="p-3 text-right">{formatCurrency(report.grossPayments)}</td>
                  <td className="p-3 text-right">{report.totalTransactions}</td>
                  <td className="p-3 text-right text-red-600">
                    {report.refundsAmount > 0 ? formatCurrency(report.refundsAmount) : "-"}
                  </td>
                  <td className="p-3 text-right">{formatCurrency(report.netPayments)}</td>
                  <td className="p-3 text-right text-green-600">
                    {formatCurrency(report.platformFeesAmount)}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={report.status === "filed" ? "default" : "secondary"}
                    >
                      {report.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
