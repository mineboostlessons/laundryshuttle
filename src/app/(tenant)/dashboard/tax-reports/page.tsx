import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getTaxReport, getAvailableTaxYears } from "./actions";
import { TaxReportsView } from "./tax-reports-view";

export default async function TaxReportsPage() {
  await requireRole(UserRole.OWNER);

  const currentYear = new Date().getFullYear();
  const [report, years] = await Promise.all([
    getTaxReport(currentYear),
    getAvailableTaxYears(),
  ]);

  return (
    <TaxReportsView
      initialReport={report}
      availableYears={years}
      currentYear={currentYear}
    />
  );
}
