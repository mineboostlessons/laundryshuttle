"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
} from "lucide-react";
import { parseCSV, importCustomers, type CustomerRow, type ImportResult } from "./actions";

type Step = "upload" | "preview" | "importing" | "done";

export function CSVImporter() {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [parseErrors, setParseErrors] = useState<
    Array<{ row: number; error: string }>
  >([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      startTransition(async () => {
        try {
          const parsed = await parseCSV(text);
          setRows(parsed.rows);
          setParseErrors(parsed.errors);
          if (parsed.rows.length > 0) {
            setStep("preview");
          } else if (parsed.errors.length > 0) {
            setError(parsed.errors[0].error);
          } else {
            setError("No valid rows found in CSV.");
          }
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to parse CSV."
          );
        }
      });
    };
    reader.readAsText(file);
  }

  function handleImport() {
    setStep("importing");
    startTransition(async () => {
      try {
        const importResult = await importCustomers(rows);
        setResult(importResult);
        setStep("done");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Import failed."
        );
        setStep("preview");
      }
    });
  }

  function reset() {
    setStep("upload");
    setRows([]);
    setParseErrors([]);
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">CSV Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Your CSV should include these columns (header row required):
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge>firstName *</Badge>
            <Badge>lastName *</Badge>
            <Badge>email *</Badge>
            <Badge variant="outline">phone</Badge>
            <Badge variant="outline">addressLine1</Badge>
            <Badge variant="outline">addressLine2</Badge>
            <Badge variant="outline">city</Badge>
            <Badge variant="outline">state</Badge>
            <Badge variant="outline">zip</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            * Required fields. Column names are case-insensitive. Underscored
            variants (e.g. first_name) are also accepted. Duplicate emails are
            skipped.
          </p>
          <div className="rounded-md bg-muted p-3 font-mono text-xs">
            firstName,lastName,email,phone,addressLine1,city,state,zip
            <br />
            John,Doe,john@example.com,5551234567,123 Main St,New York,NY,10001
          </div>
        </CardContent>
      </Card>

      {/* Upload */}
      {step === "upload" && (
        <Card>
          <CardContent className="p-8">
            <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">
                Click to upload CSV file
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                .csv files only
              </p>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isPending}
              />
            </label>
            {error && (
              <div className="flex items-center gap-2 mt-4 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            {isPending && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Parsing CSV...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                <FileText className="inline h-5 w-5 mr-2" />
                Preview ({rows.length} customers)
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reset}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleImport} disabled={isPending}>
                  Import {rows.length} Customers
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {parseErrors.length > 0 && (
              <div className="mb-4 rounded-md bg-yellow-50 p-3">
                <p className="text-sm font-medium text-yellow-800">
                  {parseErrors.length} row(s) had errors and will be skipped:
                </p>
                <ul className="mt-1 text-xs text-yellow-700 space-y-1">
                  {parseErrors.slice(0, 5).map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.error}
                    </li>
                  ))}
                  {parseErrors.length > 5 && (
                    <li>...and {parseErrors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                      Phone
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                      Address
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 px-2">
                        {row.firstName} {row.lastName}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {row.email}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {row.phone || "-"}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {row.addressLine1
                          ? `${row.addressLine1}, ${row.city}`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Showing first 20 of {rows.length} rows
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Importing */}
      {step === "importing" && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">
              Importing {rows.length} customers...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Done */}
      {step === "done" && result && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <h3 className="text-lg font-semibold mt-3">Import Complete</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 mt-6 max-w-md mx-auto">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {result.created}
                </p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {result.skipped}
                </p>
                <p className="text-xs text-muted-foreground">
                  Skipped (duplicate)
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {result.errors.length}
                </p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4 rounded-md bg-red-50 p-3 max-w-md mx-auto">
                <p className="text-sm font-medium text-red-800">
                  Failed rows:
                </p>
                <ul className="mt-1 text-xs text-red-700 space-y-1">
                  {result.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>
                      Row {e.row} ({e.email}): {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-center mt-6">
              <Button onClick={reset}>Import Another File</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
