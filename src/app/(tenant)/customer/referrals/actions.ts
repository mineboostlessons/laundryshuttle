"use server";

import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import {
  getCustomerReferralInfo,
  getReferralProgramConfig,
  type CustomerReferralInfo,
  type ReferralProgramConfig,
} from "@/lib/referrals";

export interface CustomerReferralPageData {
  config: ReferralProgramConfig;
  referralInfo: CustomerReferralInfo;
}

export async function getCustomerReferralData(): Promise<CustomerReferralPageData> {
  const session = await requireRole(UserRole.CUSTOMER);
  const tenant = await requireTenant();

  const [config, referralInfo] = await Promise.all([
    getReferralProgramConfig(tenant.id),
    getCustomerReferralInfo(tenant.id, session.user.id),
  ]);

  return { config, referralInfo };
}
