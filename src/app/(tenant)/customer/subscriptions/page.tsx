import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getAvailablePlans, getMySubscription } from "./actions";
import { SubscriptionView } from "./subscription-view";

export default async function CustomerSubscriptionsPage() {
  await requireRole(UserRole.CUSTOMER);

  const [plans, activeSubscription] = await Promise.all([
    getAvailablePlans(),
    getMySubscription(),
  ]);

  return (
    <SubscriptionView
      plans={plans}
      activeSubscription={activeSubscription as Parameters<typeof SubscriptionView>[0]["activeSubscription"]}
    />
  );
}
