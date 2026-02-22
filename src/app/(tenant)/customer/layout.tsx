import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { CustomerSidebar } from "./components/customer-sidebar";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(UserRole.CUSTOMER);
  const tenant = await requireTenant();

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex">
        <CustomerSidebar
          userName={session.user.name ?? session.user.email}
          userEmail={session.user.email}
          businessName={tenant.businessName}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
