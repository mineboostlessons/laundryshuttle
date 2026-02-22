import type { Metadata } from "next";
import { getCustomerReferralData } from "./actions";
import { CustomerReferralView } from "./customer-referral-view";

export const metadata: Metadata = {
  title: "Refer a Friend",
};

export default async function CustomerReferralsPage() {
  const data = await getCustomerReferralData();
  return <CustomerReferralView data={data} />;
}
