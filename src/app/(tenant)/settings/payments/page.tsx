import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { ConnectOnboarding } from "./connect-onboarding";

export default async function PaymentsSettingsPage() {
  const session = await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const tenantRecord = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      stripeConnectAccountId: true,
      stripeConnectStatus: true,
      stripeOnboardingComplete: true,
      platformFeePercent: true,
    },
  });

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    pending: "secondary",
    restricted: "outline",
    disabled: "destructive",
  };

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/settings"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Settings
          </Link>
          <h1 className="text-xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">
            Connect your Stripe account to accept payments
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {/* Stripe Connect Status */}
        <Card>
          <CardHeader>
            <CardTitle>Stripe Connect</CardTitle>
            <CardDescription>
              Connect your Stripe account to receive payments from customers.
              A {((tenantRecord?.platformFeePercent ?? 0.01) * 100).toFixed(0)}% platform fee is
              deducted from each transaction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tenantRecord?.stripeConnectAccountId ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge variant={statusColors[tenantRecord.stripeConnectStatus] ?? "secondary"}>
                    {tenantRecord.stripeConnectStatus}
                  </Badge>
                </div>

                {tenantRecord.stripeOnboardingComplete && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Onboarding complete — you can accept payments
                  </div>
                )}

                <ConnectOnboarding
                  tenantId={tenant.id}
                  hasAccount={true}
                  isComplete={tenantRecord.stripeOnboardingComplete}
                />
              </div>
            ) : (
              <ConnectOnboarding
                tenantId={tenant.id}
                hasAccount={false}
                isComplete={false}
              />
            )}
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Processing</CardTitle>
            <CardDescription>
              How payments work on your platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                Customers pay via credit/debit card at checkout
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                Funds are deposited directly into your Stripe account
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                A {((tenantRecord?.platformFeePercent ?? 0.01) * 100).toFixed(0)}% platform fee is
                automatically deducted
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                Payouts follow your Stripe payout schedule
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
