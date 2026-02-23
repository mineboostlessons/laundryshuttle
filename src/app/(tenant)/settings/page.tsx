import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { SignOutButton } from "@/app/(platform)/admin/sign-out-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const session = await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              {session.user.name} &middot; {session.user.email}
            </p>
          </div>
          <SignOutButton />
        </div>
      </header>
      <div className="mx-auto max-w-5xl p-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/settings/pages">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Pages</CardTitle>
                <CardDescription>
                  Manage your website pages and content blocks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  Manage Pages
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings/theme">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Theme</CardTitle>
                <CardDescription>
                  Your site&apos;s look and feel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {tenant.themePreset}
                  </Badge>
                  <span className="text-sm text-muted-foreground">preset</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings/payments">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Payments</CardTitle>
                <CardDescription>
                  Connect Stripe and manage payment settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  Manage Payments
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings/notifications">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription>
                  Email, SMS, and push notification settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  Manage Notifications
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/sandbox">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Sandbox Mode</CardTitle>
                <CardDescription>
                  Test with sample data without affecting real operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  Manage Sandbox
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings/domains">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Custom Domain</CardTitle>
                <CardDescription>
                  Connect your own domain name to your website
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  Manage Domain
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="text-lg">Business Info</CardTitle>
              <CardDescription>
                Update your business details and contact info
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-muted-foreground">Coming soon</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
