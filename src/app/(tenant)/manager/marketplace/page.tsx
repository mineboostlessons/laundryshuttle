import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getMarketplaceApps } from "@/app/(tenant)/dashboard/marketplace/actions";
import { MarketplaceView } from "@/app/(tenant)/dashboard/marketplace/marketplace-view";

export default async function ManagerMarketplacePage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const apps = await getMarketplaceApps();

  return <MarketplaceView initialApps={apps} />;
}
