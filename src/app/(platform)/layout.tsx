import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { AdminLayoutShell } from "./admin/admin-layout-shell";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(UserRole.PLATFORM_ADMIN);

  return (
    <AdminLayoutShell email={session.user.email}>
      {children}
    </AdminLayoutShell>
  );
}
