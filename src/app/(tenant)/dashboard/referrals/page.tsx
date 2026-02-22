import type { Metadata } from "next";
import { getReferralDashboard } from "./actions";
import { ReferralDashboardView } from "./referral-dashboard-view";

export const metadata: Metadata = {
  title: "Referral Program",
};

export default async function ReferralsPage() {
  const data = await getReferralDashboard();
  return <ReferralDashboardView data={data} />;
}
