"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Power,
  PowerOff,
  RefreshCw,
  AlertTriangle,
  Package,
  Users,
} from "lucide-react";
import { enableSandbox, disableSandbox, resetSandboxData } from "./actions";

interface SandboxControlsProps {
  isSandbox: boolean;
  sandboxExpiresAt: string | null;
  sandboxOrders: number;
  sandboxUsers: number;
  businessName: string;
}

export function SandboxControls({
  isSandbox,
  sandboxExpiresAt,
  sandboxOrders,
  sandboxUsers,
  businessName,
}: SandboxControlsProps) {
  const [enableState, enableAction, enablePending] = useActionState(
    enableSandbox,
    { success: false }
  );
  const [resetting, setResetting] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const expiresDate = sandboxExpiresAt ? new Date(sandboxExpiresAt) : null;
  const daysLeft = expiresDate
    ? Math.max(
        0,
        Math.ceil(
          (expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const handleReset = async () => {
    setResetting(true);
    await resetSandboxData();
    setResetting(false);
  };

  const handleDisable = async () => {
    setDisabling(true);
    await disableSandbox();
    setDisabling(false);
    setConfirmDisable(false);
  };

  if (!isSandbox) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Enable Sandbox Mode
            </CardTitle>
            <CardDescription>
              Sandbox mode creates sample customers, orders, and transactions so
              you can explore every feature of your dashboard without affecting
              real data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                <h4 className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                  What sandbox mode does:
                </h4>
                <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
                  <li>
                    - Creates 5 sample customer accounts with realistic names
                  </li>
                  <li>
                    - Generates 10 sample orders across different statuses
                  </li>
                  <li>- Shows a yellow banner across your dashboard</li>
                  <li>
                    - All sandbox data is clearly labeled and can be removed
                    instantly
                  </li>
                </ul>
              </div>

              <form action={enableAction}>
                <div className="flex items-center gap-4">
                  <div>
                    <label
                      htmlFor="durationDays"
                      className="text-sm font-medium"
                    >
                      Duration
                    </label>
                    <select
                      id="durationDays"
                      name="durationDays"
                      defaultValue="14"
                      className="ml-2 rounded-md border bg-background px-3 py-1.5 text-sm"
                    >
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                      <option value="60">60 days</option>
                    </select>
                  </div>
                  <Button type="submit" disabled={enablePending}>
                    <Power className="mr-2 h-4 w-4" />
                    {enablePending ? "Enabling..." : "Enable Sandbox"}
                  </Button>
                </div>
              </form>

              {enableState.error && (
                <p className="text-sm text-destructive">{enableState.error}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-amber-600" />
              Sandbox Mode Active
            </CardTitle>
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              {daysLeft !== null
                ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`
                : "No expiration"}
            </Badge>
          </div>
          <CardDescription>
            {businessName} is running with sample data. Real customers and
            orders are not affected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <Package className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-1 text-2xl font-bold">{sandboxOrders}</p>
              <p className="text-xs text-muted-foreground">Sample Orders</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <Users className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-1 text-2xl font-bold">{sandboxUsers}</p>
              <p className="text-xs text-muted-foreground">
                Sample Customers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={resetting}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${resetting ? "animate-spin" : ""}`}
          />
          {resetting ? "Resetting..." : "Reset Sandbox Data"}
        </Button>

        {!confirmDisable ? (
          <Button
            variant="destructive"
            onClick={() => setConfirmDisable(true)}
          >
            <PowerOff className="mr-2 h-4 w-4" />
            Disable Sandbox
          </Button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-sm">
              This will delete all sandbox data. Are you sure?
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisable}
              disabled={disabling}
            >
              {disabling ? "Disabling..." : "Confirm"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDisable(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
