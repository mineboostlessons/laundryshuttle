import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getWalletInfo } from "./actions";
import { WalletView } from "./wallet-view";

export default async function WalletPage() {
  await requireRole(UserRole.CUSTOMER);
  const walletInfo = await getWalletInfo();

  return <WalletView initialData={walletInfo} />;
}
