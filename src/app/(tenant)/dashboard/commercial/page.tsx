import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getCommercialAccounts } from "./actions";
import { CommercialView } from "./commercial-view";

export default async function CommercialAccountsPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const accounts = await getCommercialAccounts();

  return <CommercialView initialAccounts={accounts} />;
}
