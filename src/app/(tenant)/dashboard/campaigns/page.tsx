import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getWinBackData, getCampaignStats } from "./actions";
import { CampaignsView } from "./campaigns-view";

export default async function CampaignsPage() {
  await requireRole(UserRole.OWNER);

  const [winBackData, campaignStats] = await Promise.all([
    getWinBackData(),
    getCampaignStats(),
  ]);

  return (
    <CampaignsView initialData={winBackData} initialStats={campaignStats} />
  );
}
