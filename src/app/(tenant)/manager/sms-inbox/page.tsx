import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getSmsConversations } from "@/app/(tenant)/dashboard/sms-inbox/actions";
import { SmsInboxView } from "@/app/(tenant)/dashboard/sms-inbox/sms-inbox-view";

export default async function ManagerSmsInboxPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);

  const conversations = await getSmsConversations();

  return <SmsInboxView conversations={conversations} />;
}
