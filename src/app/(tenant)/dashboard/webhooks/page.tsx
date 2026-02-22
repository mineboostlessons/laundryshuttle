import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getWebhookEndpoints, getAvailableEvents } from "./actions";
import { WebhooksView } from "./webhooks-view";

export default async function WebhooksPage() {
  await requireRole(UserRole.OWNER);

  const [endpoints, availableEvents] = await Promise.all([
    getWebhookEndpoints(),
    getAvailableEvents(),
  ]);

  return (
    <WebhooksView
      initialEndpoints={endpoints}
      availableEvents={availableEvents}
    />
  );
}
