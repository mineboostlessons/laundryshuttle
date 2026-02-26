import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { getStaffList } from "../actions";
import { StaffListView } from "./staff-list-view";

export default async function StaffPage() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();
  const staff = await getStaffList();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <p className="text-muted-foreground">
          Manage your team members and their roles
        </p>
      </div>
      <StaffListView staff={staff} tenantSlug={tenant.slug} />
    </div>
  );
}
