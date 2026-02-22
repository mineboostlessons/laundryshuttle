"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";

interface ConnectOnboardingProps {
  tenantId: string;
  hasAccount: boolean;
  isComplete: boolean;
}

export function ConnectOnboarding({
  tenantId,
  hasAccount,
  isComplete,
}: ConnectOnboardingProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const action = hasAccount ? "create_account_link" : "create_account";

      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          tenantId,
          returnUrl: `${window.location.origin}/settings/payments?status=complete`,
          refreshUrl: `${window.location.origin}/settings/payments?status=refresh`,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Failed to start onboarding");
        return;
      }

      const url = data.data.onboardingUrl;
      if (url) {
        window.location.href = url;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dashboard_link",
          tenantId,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Failed to open dashboard");
        return;
      }

      window.open(data.data.dashboardUrl, "_blank");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {!hasAccount && (
          <Button onClick={handleConnect} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Connect Stripe Account
          </Button>
        )}

        {hasAccount && !isComplete && (
          <Button onClick={handleConnect} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Complete Onboarding
          </Button>
        )}

        {hasAccount && isComplete && (
          <Button variant="outline" onClick={handleDashboard} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Open Stripe Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}
