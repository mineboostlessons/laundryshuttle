import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendNotification, type NotificationEvent } from "@/lib/notifications";
import { UserRole } from "@/types";

const VALID_EVENTS: NotificationEvent[] = [
  "order_confirmed",
  "order_ready",
  "order_completed",
  "order_out_for_delivery",
  "driver_en_route",
  "delivery_completed",
  "payment_received",
  "order_cancelled",
  "pickup_reminder",
  "subscription_renewal",
  "promo_available",
];

const sendNotificationSchema = z.object({
  event: z.enum(VALID_EVENTS as [string, ...string[]]),
  userId: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().optional(),
  channels: z
    .array(z.enum(["email", "sms", "push"]))
    .optional(),
  variables: z.record(z.string()).default({}),
});

/**
 * POST /api/notifications/send
 * Send a notification — requires staff authentication.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const staffRoles: string[] = [
      UserRole.OWNER,
      UserRole.MANAGER,
      UserRole.ATTENDANT,
      UserRole.PLATFORM_ADMIN,
    ];
    if (!staffRoles.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    if (!session.user.tenantId && session.user.role !== UserRole.PLATFORM_ADMIN) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = sendNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const tenantId = session.user.tenantId!;

    const result = await sendNotification({
      tenantId,
      userId: data.userId,
      event: data.event as NotificationEvent,
      channels: data.channels as ("email" | "sms" | "push")[] | undefined,
      recipientEmail: data.recipientEmail,
      recipientPhone: data.recipientPhone,
      variables: data.variables,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Send notification error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
