"use client";

import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SandboxBannerProps {
  businessName: string;
  expiresAt?: string | null;
}

export function SandboxBanner({ businessName, expiresAt }: SandboxBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const expiresDate = expiresAt ? new Date(expiresAt) : null;
  const daysLeft = expiresDate
    ? Math.max(
        0,
        Math.ceil(
          (expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return (
    <div className="relative border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2">
        <FlaskConical className="h-4 w-4 shrink-0" />
        <span>
          <strong>Sandbox Mode</strong> — {businessName} is using sample data.
          Changes won&apos;t affect your live business.
          {daysLeft !== null && (
            <span className="ml-1">
              ({daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining)
            </span>
          )}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 h-6 w-6 p-0 text-amber-800 hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100"
          onClick={() => setDismissed(true)}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </div>
  );
}
