import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { StaffSidebar } from "@/components/dashboard/staff-sidebar";

export default async function OwnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex">
        <StaffSidebar
          userName={session.user.name ?? session.user.email}
          userEmail={session.user.email}
          userRole={session.user.role}
          businessName={tenant.businessName}
          logoUrl={tenant.themeConfig?.logoUrl ?? null}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
