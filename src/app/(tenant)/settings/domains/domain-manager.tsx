"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  addCustomDomainAction,
  verifyDomainAction,
  removeDomainAction,
  type DomainActionState,
} from "./actions";
import type { DomainSetupInfo } from "@/lib/custom-domains";

interface DomainManagerProps {
  tenantSlug: string;
  currentDomain: string | null;
  verification: DomainSetupInfo | null;
}

const initialState: DomainActionState = {};

export function DomainManager({
  tenantSlug,
  currentDomain,
  verification,
}: DomainManagerProps) {
  const [addState, addAction, isAdding] = useActionState(
    addCustomDomainAction,
    initialState
  );
  const [verifyPending, startVerify] = useTransition();
  const [removePending, startRemove] = useTransition();

  const showDnsInstructions =
    verification && verification.status !== "verified";
  const isVerified = verification?.status === "verified" || !!currentDomain;

  return (
    <div className="space-y-6">
      {/* Current status */}
      {isVerified && currentDomain && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Active Custom Domain</CardTitle>
                <CardDescription>
                  Your site is accessible at this domain
                </CardDescription>
              </div>
              <Badge variant="success">Verified</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-lg font-medium">{currentDomain}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Also available at{" "}
                  <span className="font-mono">
                    {tenantSlug}.laundryshuttle.com
                  </span>
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                disabled={removePending}
                onClick={() => {
                  startRemove(async () => {
                    await removeDomainAction();
                  });
                }}
              >
                {removePending ? "Removing..." : "Remove Domain"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add domain form */}
      {!isVerified && !verification && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Custom Domain</CardTitle>
            <CardDescription>
              Use your own domain name instead of{" "}
              <span className="font-mono">
                {tenantSlug}.laundryshuttle.com
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {addState.error && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {addState.error}
              </div>
            )}
            {addState.success && (
              <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
                {addState.message}
              </div>
            )}

            <form action={addAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain Name</Label>
                <Input
                  id="domain"
                  name="domain"
                  type="text"
                  placeholder="www.yourbusiness.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the full domain (e.g., www.mybusiness.com or
                  laundry.mybusiness.com)
                </p>
              </div>
              <Button type="submit" disabled={isAdding}>
                {isAdding ? "Adding..." : "Add Domain"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* DNS instructions */}
      {showDnsInstructions && verification && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  Configure DNS for{" "}
                  <span className="font-mono">{verification.domain}</span>
                </CardTitle>
                <CardDescription>
                  Add one of the following DNS records at your domain registrar
                </CardDescription>
              </div>
              <Badge
                variant={
                  verification.status === "pending" ? "warning" : "destructive"
                }
              >
                {verification.status === "pending"
                  ? "Pending Verification"
                  : "Verification Failed"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {verification.failureReason && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {verification.failureReason}
              </div>
            )}

            {/* Option 1: CNAME */}
            <div className="space-y-3">
              <h4 className="font-semibold">Option 1: CNAME Record (Recommended)</h4>
              <div className="rounded-lg border bg-muted/50 p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="pr-4 font-mono">CNAME</td>
                      <td className="pr-4 font-mono">{verification.domain}</td>
                      <td className="font-mono">{verification.cnameTarget}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Option 2: TXT */}
            <div className="space-y-3">
              <h4 className="font-semibold">
                Option 2: TXT Record (for verification only)
              </h4>
              <p className="text-sm text-muted-foreground">
                If you cannot use a CNAME (e.g., apex domain), add a TXT record
                for verification, then point your domain using an A record or
                ALIAS.
              </p>
              <div className="rounded-lg border bg-muted/50 p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="pr-4 font-mono">TXT</td>
                      <td className="pr-4 font-mono break-all">
                        {verification.txtRecordName}
                      </td>
                      <td className="font-mono break-all">
                        {verification.verificationToken}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                disabled={verifyPending}
                onClick={() => {
                  startVerify(async () => {
                    await verifyDomainAction();
                  });
                }}
              >
                {verifyPending ? "Verifying..." : "Verify DNS"}
              </Button>
              <Button
                variant="ghost"
                disabled={removePending}
                onClick={() => {
                  startRemove(async () => {
                    await removeDomainAction();
                  });
                }}
              >
                {removePending ? "Cancelling..." : "Cancel"}
              </Button>
            </div>

            {verification.lastCheckedAt && (
              <p className="text-xs text-muted-foreground">
                Last checked:{" "}
                {new Date(verification.lastCheckedAt).toLocaleString()}
              </p>
            )}

            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-medium">DNS changes can take up to 48 hours to propagate.</p>
              <p className="mt-1">
                After adding the DNS records, wait a few minutes and click
                &quot;Verify DNS&quot;. If verification fails, try again in a
                few hours.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
