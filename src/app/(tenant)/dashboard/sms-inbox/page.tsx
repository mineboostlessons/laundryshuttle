import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getSmsConversations } from "./actions";
import { SmsInboxView } from "./sms-inbox-view";

export default async function SmsInboxPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);

  const conversations = await getSmsConversations();

  return <SmsInboxView conversations={conversations} />;
}
