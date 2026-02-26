import { getCustomerProfile } from "../actions";
import { formatCurrency } from "@/lib/utils";
import { LocalDateOnly } from "@/components/ui/local-date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";
import { ProfileForm } from "./profile-form";
import { PreferencesForm } from "./preferences-form";

export default async function ProfilePage() {
  const profile = await getCustomerProfile();
  if (!profile) throw new Error("Profile not found");

  const preferences = (profile.defaultPreferences ?? {}) as Record<
    string,
    unknown
  >;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile & Preferences</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account details and laundry preferences.
        </p>
      </div>

      {/* Wallet */}
      <Card>
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3">
              <Wallet className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Wallet Balance</p>
              <p className="text-xl font-bold">
                {formatCurrency(profile.walletBalance)}
              </p>
            </div>
          </div>
          <Badge variant="outline">
            Member since{" "}
            <LocalDateOnly
              date={profile.createdAt}
              options={{ month: "short", year: "numeric" }}
            />
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              initialData={{
                firstName: profile.firstName ?? "",
                lastName: profile.lastName ?? "",
                phone: profile.phone ?? "",
                notificationPreference: profile.notificationPreference as
                  | "email"
                  | "sms"
                  | "both"
                  | "push",
              }}
              email={profile.email}
            />
          </CardContent>
        </Card>

        {/* Laundry Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Laundry Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <PreferencesForm
              initialData={{
                detergent: (preferences.detergent as string) ?? "",
                waterTemp: (preferences.waterTemp as string) ?? "",
                fabricSoftener:
                  (preferences.fabricSoftener as boolean) ?? false,
                dryerTemp: (preferences.dryerTemp as string) ?? "",
                specialInstructions:
                  (preferences.specialInstructions as string) ?? "",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
