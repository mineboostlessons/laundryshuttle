import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getMarketplaceApps } from "./actions";
import { MarketplaceView } from "./marketplace-view";

export default async function MarketplacePage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const apps = await getMarketplaceApps();

  return <MarketplaceView initialApps={apps} />;
}
