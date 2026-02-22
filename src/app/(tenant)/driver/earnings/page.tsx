import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getDriverEarnings } from "../actions";
import { DriverHeader } from "../driver-header";
import { EarningsView } from "./earnings-view";

export default async function DriverEarningsPage() {
  const session = await requireRole(UserRole.DRIVER);
  const data = await getDriverEarnings();

  return (
    <main className="min-h-screen bg-muted/30">
      <DriverHeader
        userName={session.user.name ?? session.user.email}
        userEmail={session.user.email}
      />
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <EarningsView initialData={data} />
      </div>
    </main>
  );
}
