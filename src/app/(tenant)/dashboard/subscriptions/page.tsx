import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getSubscriptionPlans, getSubscriptionSummary } from "./actions";
import { SubscriptionsManager } from "./subscriptions-manager";

export default async function SubscriptionsPage() {
  await requireRole(UserRole.OWNER);

  const [plans, summary] = await Promise.all([
    getSubscriptionPlans(),
    getSubscriptionSummary(),
  ]);

  return <SubscriptionsManager initialPlans={plans} summary={summary} />;
}
