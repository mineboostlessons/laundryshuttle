import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER, UserRole.ATTENDANT);
  await requireTenant();

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
