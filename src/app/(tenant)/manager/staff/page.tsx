import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { getStaffList } from "@/app/(tenant)/dashboard/actions";
import { StaffListView } from "@/app/(tenant)/dashboard/staff/staff-list-view";

export default async function ManagerStaffPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();
  const staff = await getStaffList();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Staff</h1>
        <p className="text-muted-foreground">View team members</p>
      </div>
      <StaffListView
        staff={staff}
        tenantSlug={tenant.slug}
        canCreate={tenant.managerCanCreateStaff}
      />
    </div>
  );
}
