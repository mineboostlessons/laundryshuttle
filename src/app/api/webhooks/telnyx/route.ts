import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendSms, normalizePhone, verifyWebhookSignature } from "@/lib/telnyx";

/**
 * POST /api/webhooks/telnyx
 * Handles inbound SMS messages and delivery status updates from Telnyx.
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();

    // Verify webhook signature
    const signature = request.headers.get("telnyx-signature-ed25519") ?? "";
    const timestamp = request.headers.get("telnyx-timestamp") ?? "";

    if (process.env.TELNYX_WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(body, signature, timestamp);
      if (!isValid) {
        console.error("Telnyx webhook signature verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(body);

    // Telnyx webhook events have a data.event_type field
    const eventType = payload?.data?.event_type;
    const eventData = payload?.data?.payload;

    switch (eventType) {
      case "message.sent":
      case "message.delivered":
        await handleDeliveryStatus(eventData, eventType);
        break;

      case "message.received":
        await handleInboundMessage(eventData);
        break;

      case "message.finalized":
        await handleDeliveryStatus(eventData, eventType);
        break;

      default:
        // Unknown event — acknowledge
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telnyx webhook error:", error);
    // Always return 200 to prevent retries for parsing errors
    return NextResponse.json({ success: true });
  }
}

// =============================================================================
// Delivery Status Updates
// =============================================================================

async function handleDeliveryStatus(
  eventData: Record<string, unknown> | undefined,
  eventType: string
) {
  if (!eventData) return;

  const messageId = eventData.id as string | undefined;
  if (!messageId) return;

  const statusMap: Record<string, string> = {
    "message.sent": "sent",
    "message.delivered": "delivered",
    "message.finalized": "delivered",
  };

  const newStatus = statusMap[eventType] ?? "sent";

  // Update the notification log entry with the delivery status
  try {
    await prisma.notificationLog.updateMany({
      where: {
        externalId: messageId,
        channel: "sms",
      },
      data: {
        status: newStatus,
      },
    });
  } catch {
    // Log entry may not exist — ignore
  }
}

// =============================================================================
// Inbound SMS Messages
// =============================================================================

/** Keyword commands customers can text */
const KEYWORD_COMMANDS: Record<string, string> = {
  HELP: "help",
  TRACK: "track",
  STATUS: "track",
  CANCEL: "cancel",
  STOP: "opt_out",
  UNSUBSCRIBE: "opt_out",
  START: "opt_in",
  SUBSCRIBE: "opt_in",
  YES: "opt_in",
};

async function handleInboundMessage(
  eventData: Record<string, unknown> | undefined
) {
  if (!eventData) return;

  const from = (eventData.from as { phone_number?: string })?.phone_number;
  const text = eventData.text as string | undefined;

  if (!from || !text) return;

  // Normalize inbound phone to E.164 for consistent matching
  const normalizedFrom = normalizePhone(from);
  const digits = normalizedFrom.replace(/\D/g, "");

  // Find the customer by phone number — try exact E.164 first, then suffix match
  const user = await prisma.user.findFirst({
    where: {
      role: "customer",
      OR: [
        { phone: normalizedFrom },
        // Match last 10 digits to handle varied storage formats
        ...(digits.length >= 10
          ? [{ phone: { endsWith: digits.slice(-10) } }]
          : []),
      ],
    },
    select: {
      id: true,
      tenantId: true,
      firstName: true,
      notificationPreference: true,
    },
  });

  if (!user || !user.tenantId) return;

  // Get tenant info for reply messages
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { businessName: true, phone: true },
  });

  const businessName = tenant?.businessName ?? "Laundry Shuttle";

  // Check for keyword commands
  const keyword = text.trim().toUpperCase();
  const command = KEYWORD_COMMANDS[keyword];

  if (command) {
    await handleKeywordCommand(command, user, normalizedFrom, businessName);
    return;
  }

  // Find the customer's most recent active order
  let order = await prisma.order.findFirst({
    where: {
      customerId: user.id,
      tenantId: user.tenantId,
      status: {
        notIn: ["completed", "cancelled", "refunded"],
      },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, orderNumber: true },
  });

  // Fallback: if no active order, use the most recent order of any status
  if (!order) {
    order = await prisma.order.findFirst({
      where: {
        customerId: user.id,
        tenantId: user.tenantId,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNumber: true },
    });
  }

  // Save as an order message (linked to order if available)
  if (order) {
    await prisma.orderMessage.create({
      data: {
        orderId: order.id,
        senderType: "customer",
        senderId: user.id,
        message: text,
        channel: "sms",
      },
    });
  }

  // Send auto-acknowledgment
  await sendSms({
    to: normalizedFrom,
    body: `${businessName}: Got your message! Our team will reply shortly. Reply HELP for commands.`,
  }).catch(console.error);
}

// =============================================================================
// Keyword Command Handlers
// =============================================================================

async function handleKeywordCommand(
  command: string,
  user: { id: string; tenantId: string | null; firstName: string | null; notificationPreference: string },
  phone: string,
  businessName: string
) {
  if (!user.tenantId) return;

  switch (command) {
    case "help": {
      await sendSms({
        to: phone,
        body: `${businessName} SMS Commands:\nTRACK - Check order status\nSTOP - Unsubscribe from SMS\nSTART - Re-subscribe\nOr just text us and we'll reply!`,
      });
      break;
    }

    case "track": {
      const activeOrder = await prisma.order.findFirst({
        where: {
          customerId: user.id,
          tenantId: user.tenantId,
          status: { notIn: ["completed", "cancelled", "refunded"] },
        },
        orderBy: { createdAt: "desc" },
        select: { orderNumber: true, status: true },
      });

      if (activeOrder) {
        const statusLabels: Record<string, string> = {
          pending: "Pending confirmation",
          confirmed: "Confirmed",
          picked_up: "Picked up",
          processing: "Being processed",
          ready: "Ready",
          out_for_delivery: "Out for delivery",
          delivered: "Delivered",
        };
        const label = statusLabels[activeOrder.status] ?? activeOrder.status;
        await sendSms({
          to: phone,
          body: `${businessName}: Order ${activeOrder.orderNumber} is currently: ${label}.`,
        });
      } else {
        await sendSms({
          to: phone,
          body: `${businessName}: No active orders found. Place an order on our website!`,
        });
      }
      break;
    }

    case "cancel": {
      const orderToCancel = await prisma.order.findFirst({
        where: {
          customerId: user.id,
          tenantId: user.tenantId,
          status: { in: ["pending", "confirmed"] },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, orderNumber: true },
      });

      if (orderToCancel) {
        await sendSms({
          to: phone,
          body: `${businessName}: To cancel order ${orderToCancel.orderNumber}, please contact us directly or visit your account dashboard. We can't cancel orders already in processing.`,
        });
      } else {
        await sendSms({
          to: phone,
          body: `${businessName}: No cancellable orders found.`,
        });
      }
      break;
    }

    case "opt_out": {
      await prisma.user.update({
        where: { id: user.id },
        data: { notificationPreference: "email" },
      });

      await sendSms({
        to: phone,
        body: `${businessName}: You've been unsubscribed from SMS. Reply START to re-subscribe.`,
      });
      break;
    }

    case "opt_in": {
      await prisma.user.update({
        where: { id: user.id },
        data: { notificationPreference: "both" },
      });

      await sendSms({
        to: phone,
        body: `${businessName}: You're now subscribed to SMS notifications. Reply STOP to unsubscribe.`,
      });
      break;
    }
  }
}
