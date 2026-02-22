import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getInvoices, getInvoiceStats } from "./actions";
import { getCommercialAccounts } from "../commercial/actions";
import { InvoicesView } from "./invoices-view";

export default async function InvoicesPage() {
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
