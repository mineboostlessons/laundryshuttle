import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getAdminMarketplaceApps } from "./actions";
import { AdminMarketplaceView } from "./admin-marketplace-view";

export default async function AdminMarketplacePage() {
  await requireRole(UserRole.PLATFORM_ADMIN);
  const apps = await getAdminMarketplaceApps();

  return <AdminMarketplaceView initialApps={apps} />;
}
