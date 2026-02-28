import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { StaffPermissionToggle } from "./staff-permission-toggle";
import { ChangePasswordForm } from "@/components/ui/change-password-form";

export default async function SettingsPage() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const laundromat = await prisma.laundromat.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    select: { serviceAreaPolygons: true },
  });
  const polygons = laundromat?.serviceAreaPolygons as GeoJSON.FeatureCollection | null;
  const polygonCount = polygons?.features?.length ?? 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your business configuration
        </p>
      </div>

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

        <Link href="/settings/tax">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Tax</CardTitle>
              <CardDescription>
                Set the default tax rate for taxable items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {(tenant.defaultTaxRate * 100).toFixed(2)}%
                </Badge>
                <span className="text-sm text-muted-foreground">rate</span>
              </div>
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

        <Link href="/settings/service-area">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Service Area</CardTitle>
              <CardDescription>
                Define the delivery zone on a map
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={polygonCount > 0 ? "secondary" : "outline"}>
                  {polygonCount > 0
                    ? `${polygonCount} polygon${polygonCount !== 1 ? "s" : ""}`
                    : "Not configured"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/scheduling">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Scheduling</CardTitle>
              <CardDescription>
                Same-day pickup settings and cutoff times
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">
                Manage Scheduling
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Staff Permissions</CardTitle>
            <CardDescription>
              Control what managers can do
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StaffPermissionToggle enabled={tenant.managerCanCreateStaff} />
          </CardContent>
        </Card>

        <Link href="/settings/business-info">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Business Info</CardTitle>
              <CardDescription>
                Update your business details and contact info
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">
                Manage Business Info
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Change Password */}
      <ChangePasswordForm />
    </div>
  );
}
