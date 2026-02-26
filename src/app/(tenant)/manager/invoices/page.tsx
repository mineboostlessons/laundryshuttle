import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getInvoices, getInvoiceStats } from "@/app/(tenant)/dashboard/invoices/actions";
import { getCommercialAccounts } from "@/app/(tenant)/dashboard/commercial/actions";
import { InvoicesView } from "@/app/(tenant)/dashboard/invoices/invoices-view";

export default async function ManagerInvoicesPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);

  const [invoices, stats, accounts] = await Promise.all([
    getInvoices(),
    getInvoiceStats(),
    getCommercialAccounts(),
  ]);

  return (
    <InvoicesView
      initialInvoices={invoices}
      initialStats={stats}
      commercialAccounts={accounts}
    />
  );
}
