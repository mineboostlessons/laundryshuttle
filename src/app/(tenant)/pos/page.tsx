import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getPosData } from "./actions";
import { PosTerminal } from "./pos-terminal";

export default async function PosPage() {
  const session = await requireRole(
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ATTENDANT
  );
  const data = await getPosData();

  return (
    <PosTerminal
      services={data.services}
      retailProducts={data.retailProducts}
      laundromats={data.laundromats}
      activeShift={data.activeShift}
      todayStats={data.todayStats}
      taxRate={data.taxRate}
      stripeConnected={data.stripeConnected}
      userName={session.user.name ?? session.user.email}
      userEmail={session.user.email}
      userRole={session.user.role}
    />
  );
}
