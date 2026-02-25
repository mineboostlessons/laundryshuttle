"use client";

import { useState } from "react";
import {
  previewCsv,
  executeImport,
  downloadTemplate,
  getFieldDefinitions,
  type MigrationActionState,
} from "./actions";
import type { ColumnMapping } from "@/lib/migration";
import type { ImportOperationType } from "@/lib/migration-constants";

interface MigrationLog {
  id: string;
  operationType: string;
  status: string;
  totalRecords: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: Date;
  completedAt: Date | null;
  errorLog: unknown;
}

interface Location {
  id: string;
  name: string;
}

interface MigrationViewProps {
  migrations: MigrationLog[];
  locations: Location[];
}

const IMPORT_TYPES: { value: ImportOperationType; label: string; icon: string }[] = [
  { value: "import_customers", label: "Customers", icon: "👤" },
  { value: "import_orders", label: "Historical Orders", icon: "📦" },
  { value: "import_services", label: "Services", icon: "🧺" },
  { value: "import_promo_codes", label: "Promo Codes", icon: "🏷️" },
];

export function MigrationView({ migrations, locations }: MigrationViewProps) {
  const [step, setStep] = useState<"select" | "upload" | "map" | "result">("select");
  const [importType, setImportType] = useState<ImportOperationType>("import_customers");
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [targetFields, setTargetFields] = useState<{ required: string[]; optional: string[] }>({ required: [], optional: [] });
  const [laundromatId, setLaundromatId] = useState(locations[0]?.id ?? "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<MigrationActionState | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setCsvText(text);

    const preview = await previewCsv(text);
    setHeaders(preview.headers);
    setSampleRows(preview.sampleRows);
    setTotalRows(preview.totalRows);

    const fields = await getFieldDefinitions(importType);
    setTargetFields({ required: [...fields.required], optional: [...fields.optional] });

    // Auto-map columns with matching names
    const autoMapping: ColumnMapping = {};
    const allFields = [...fields.required, ...fields.optional];
    for (const header of preview.headers) {
      const match = allFields.find(
        (f) => f.toLowerCase() === header.toLowerCase().replace(/[\s_-]/g, "")
      );
      if (match) autoMapping[header] = match;
    }
    setColumnMapping(autoMapping);
    setStep("map");
  }

  async function handleDownloadTemplate() {
    const csv = await downloadTemplate(importType);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${importType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExecuteImport() {
    setIsProcessing(true);
    const res = await executeImport(
      importType,
      csvText,
      columnMapping,
      importType === "import_orders" ? laundromatId : undefined
    );
    setResult(res);
    setIsProcessing(false);
    setStep("result");
  }

  function handleReset() {
    setStep("select");
    setCsvText("");
    setHeaders([]);
    setSampleRows([]);
    setColumnMapping({});
    setResult(null);
  }

  const allFields = [...targetFields.required, ...targetFields.optional];
  const mappedRequiredFields = targetFields.required.filter((f) =>
    Object.values(columnMapping).includes(f)
  );
  const canProceed = mappedRequiredFields.length === targetFields.required.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Migration Tools</h1>
          <p className="text-muted-foreground">
            Import data from your previous laundry software
          </p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          {showHistory ? "New Import" : "Import History"}
        </button>
      </div>

      {showHistory ? (
        <ImportHistory migrations={migrations} />
      ) : (
        <>
          {/* Step Indicator */}
          <div className="flex items-center gap-2 text-sm">
            {["Select Type", "Upload CSV", "Map Columns", "Results"].map((label, i) => {
              const stepKeys = ["select", "upload", "map", "result"] as const;
              const isActive = stepKeys[i] === step;
              const isPast = stepKeys.indexOf(step) > i;
              return (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && <div className="h-px w-8 bg-border" />}
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isPast
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isPast ? "✓" : i + 1}
                  </div>
                  <span className={isActive ? "font-medium" : "text-muted-foreground"}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Step: Select Import Type */}
          {step === "select" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {IMPORT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    setImportType(type.value);
                    setStep("upload");
                  }}
                  className="flex items-center gap-4 rounded-lg border p-4 text-left hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <span className="text-3xl">{type.icon}</span>
                  <div>
                    <div className="font-semibold">{type.label}</div>
                    <div className="text-sm text-muted-foreground">
                      Import {type.label.toLowerCase()} from CSV
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step: Upload CSV */}
          {step === "upload" && (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed p-8 text-center">
                <div className="mb-4 text-4xl">📄</div>
                <p className="mb-2 font-medium">
                  Upload your {IMPORT_TYPES.find((t) => t.value === importType)?.label} CSV
                </p>
                <p className="mb-4 text-sm text-muted-foreground">
                  Maximum 10,000 rows. File must be UTF-8 encoded.
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="mx-auto block text-sm"
                />
              </div>

              {importType === "import_orders" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Location</label>
                  <select
                    value={laundromatId}
                    onChange={(e) => setLaundromatId(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("select")}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                >
                  Back
                </button>
                <button
                  onClick={handleDownloadTemplate}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                >
                  Download Template
                </button>
              </div>
            </div>
          )}

          {/* Step: Map Columns */}
          {step === "map" && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                Found <strong>{totalRows}</strong> rows with{" "}
                <strong>{headers.length}</strong> columns. Map your CSV columns to
                the required fields below.
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">CSV Column</th>
                      <th className="px-4 py-2 text-left font-medium">Maps To</th>
                      <th className="px-4 py-2 text-left font-medium">Sample Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((header) => (
                      <tr key={header} className="border-b">
                        <td className="px-4 py-2 font-mono text-xs">{header}</td>
                        <td className="px-4 py-2">
                          <select
                            value={columnMapping[header] ?? ""}
                            onChange={(e) => {
                              setColumnMapping((prev) => ({
                                ...prev,
                                [header]: e.target.value,
                              }));
                            }}
                            className="w-full rounded-md border px-2 py-1 text-sm"
                          >
                            <option value="">-- Skip --</option>
                            {allFields.map((field) => (
                              <option key={field} value={field}>
                                {field}
                                {targetFields.required.includes(field) ? " *" : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {sampleRows[0]?.[header] ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-sm text-muted-foreground">
                Required fields:{" "}
                {targetFields.required.map((f, i) => (
                  <span key={f}>
                    {i > 0 && ", "}
                    <span
                      className={
                        Object.values(columnMapping).includes(f)
                          ? "text-green-600 font-medium"
                          : "text-red-600 font-medium"
                      }
                    >
                      {f}
                    </span>
                  </span>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("upload")}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                >
                  Back
                </button>
                <button
                  onClick={handleExecuteImport}
                  disabled={!canProceed || isProcessing}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isProcessing ? "Importing..." : `Import ${totalRows} Records`}
                </button>
              </div>
            </div>
          )}

          {/* Step: Results */}
          {step === "result" && result && (
            <div className="space-y-4">
              <div
                className={`rounded-lg border p-6 ${
                  result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                <h3 className="mb-2 text-lg font-semibold">
                  {result.success ? "Import Complete" : "Import Failed"}
                </h3>
                {result.result && (
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{result.result.totalRecords}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {result.result.successCount}
                      </div>
                      <div className="text-xs text-muted-foreground">Imported</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {result.result.failedCount}
                      </div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {result.result.skippedCount}
                      </div>
                      <div className="text-xs text-muted-foreground">Skipped</div>
                    </div>
                  </div>
                )}
              </div>

              {result.result && result.result.errors.length > 0 && (
                <div className="rounded-lg border">
                  <div className="border-b px-4 py-2 font-medium text-sm">
                    Errors ({result.result.errors.length})
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-1 text-left">Row</th>
                          <th className="px-4 py-1 text-left">Field</th>
                          <th className="px-4 py-1 text-left">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.result.errors.slice(0, 50).map((err, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-4 py-1">{err.row}</td>
                            <td className="px-4 py-1 font-mono text-xs">{err.field ?? "—"}</td>
                            <td className="px-4 py-1 text-red-600">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {result.error}
                </div>
              )}

              <button
                onClick={handleReset}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                New Import
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// Import History Component
// =============================================================================

function ImportHistory({ migrations }: { migrations: MigrationLog[] }) {
  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    processing: "bg-blue-100 text-blue-700",
    pending: "bg-yellow-100 text-yellow-700",
    rolled_back: "bg-gray-100 text-gray-700",
  };

  if (migrations.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No imports yet. Start by selecting an import type above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-2 text-left font-medium">Type</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-right font-medium">Total</th>
            <th className="px-4 py-2 text-right font-medium">Success</th>
            <th className="px-4 py-2 text-right font-medium">Failed</th>
            <th className="px-4 py-2 text-right font-medium">Skipped</th>
            <th className="px-4 py-2 text-left font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {migrations.map((log) => (
            <tr key={log.id} className="border-b">
              <td className="px-4 py-2 capitalize">
                {log.operationType.replace("import_", "").replace("_", " ")}
              </td>
              <td className="px-4 py-2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    statusColors[log.status] ?? "bg-gray-100"
                  }`}
                >
                  {log.status}
                </span>
              </td>
              <td className="px-4 py-2 text-right">{log.totalRecords}</td>
              <td className="px-4 py-2 text-right text-green-600">{log.successCount}</td>
              <td className="px-4 py-2 text-right text-red-600">{log.failedCount}</td>
              <td className="px-4 py-2 text-right text-yellow-600">{log.skippedCount}</td>
              <td className="px-4 py-2 text-muted-foreground">
                {new Date(log.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
