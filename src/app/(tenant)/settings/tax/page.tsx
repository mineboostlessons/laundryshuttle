import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getTaxSettings } from "./actions";
import { TaxSettingsView } from "./tax-settings-view";

export default async function TaxSettingsPage() {
  await requireRole(UserRole.OWNER);

  const settings = await getTaxSettings();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax Settings</h1>
        <p className="text-muted-foreground">
          Configure the tax rate applied to taxable items
        </p>
      </div>

      <TaxSettingsView initialRate={settings.defaultTaxRate} />
    </div>
  );
}
