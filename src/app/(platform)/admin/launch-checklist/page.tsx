import { runLaunchChecklist } from "./actions";

export default async function LaunchChecklistPage() {
  const checks = await runLaunchChecklist();

  const criticalChecks = checks.filter((c) => c.severity === "critical");
  const warningChecks = checks.filter((c) => c.severity === "warning");
  const infoChecks = checks.filter((c) => c.severity === "info");

  const criticalPassed = criticalChecks.every((c) => c.passed);
  const allPassed = checks.every((c) => c.passed);
  const passedCount = checks.filter((c) => c.passed).length;

  const categories = [...new Set(checks.map((c) => c.category))];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Launch Checklist</h1>
        <p className="text-sm text-muted-foreground">
          Pre-launch verification for production deployment
        </p>
      </div>

      {/* Summary Banner */}
      <div
        className={`mb-6 rounded-lg border p-5 ${
          allPassed
            ? "border-green-200 bg-green-50"
            : criticalPassed
              ? "border-amber-200 bg-amber-50"
              : "border-red-200 bg-red-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
              allPassed
                ? "bg-green-100 text-green-700"
                : criticalPassed
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            {allPassed ? (
              <CheckIcon />
            ) : criticalPassed ? (
              <WarningIcon />
            ) : (
              <XIcon />
            )}
          </span>
          <div>
            <p className="font-semibold">
              {allPassed
                ? "Ready for Launch"
                : criticalPassed
                  ? "Launch Ready (with warnings)"
                  : "Not Ready — Critical Issues"}
            </p>
            <p className="text-sm text-muted-foreground">
              {passedCount} of {checks.length} checks passed
              {!criticalPassed && ` (${criticalChecks.filter((c) => !c.passed).length} critical failures)`}
            </p>
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-8">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Readiness Score</span>
          <span className="font-medium">
            {Math.round((passedCount / checks.length) * 100)}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              allPassed ? "bg-green-500" : criticalPassed ? "bg-amber-500" : "bg-red-500"
            }`}
            style={{ width: `${(passedCount / checks.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Checks by Category */}
      {categories.map((category) => {
        const categoryChecks = checks.filter((c) => c.category === category);
        const categoryPassed = categoryChecks.every((c) => c.passed);

        return (
          <section key={category} className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-lg font-semibold">{category}</h2>
              {categoryPassed && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  All passed
                </span>
              )}
            </div>
            <div className="space-y-2">
              {categoryChecks.map((check) => (
                <div
                  key={check.id}
                  className="flex items-start gap-3 rounded-lg border bg-card p-4"
                >
                  <span className="mt-0.5 flex-shrink-0">
                    {check.passed ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckIcon />
                      </span>
                    ) : check.severity === "critical" ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <XIcon />
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <WarningIcon />
                      </span>
                    )}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{check.label}</span>
                      <SeverityBadge severity={check.severity} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{check.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Legend */}
      <div className="mt-8 rounded-lg border bg-muted/50 p-4 text-xs text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Severity Levels</p>
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            Critical — Must fix before launch
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            Warning — Recommended but not blocking
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            Info — Nice to have
          </span>
        </div>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: "critical" | "warning" | "info" }) {
  const styles = {
    critical: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
    info: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${styles[severity]}`}>
      {severity}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
