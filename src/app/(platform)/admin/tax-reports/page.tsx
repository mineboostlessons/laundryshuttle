import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getAllTaxReports } from "./actions";
import { AdminTaxReportsView } from "./admin-tax-reports-view";

export default async function AdminTaxReportsPage() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const currentYear = new Date().getFullYear();
  const reports = await getAllTaxReports(currentYear);

  return <AdminTaxReportsView initialReports={reports} currentYear={currentYear} />;
}
