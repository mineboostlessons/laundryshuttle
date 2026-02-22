"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { sendSms } from "@/lib/telnyx";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Get SMS Conversations (grouped by customer)
// ---------------------------------------------------------------------------

export async function getSmsConversations() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  // Get all SMS messages from order messages, grouped by customer
  const messages = await prisma.orderMessage.findMany({
    where: {
      channel: "sms",
      order: { tenantId: tenant.id },
    },
    orderBy: { createdAt: "desc" },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          customerId: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
        },
      },
    },
  });

  // Group by customer
  const conversationMap = new Map<
    string,
    {
      customer: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        email: string;
      };
      messages: Array<{
        id: string;
        senderType: string;
        message: string;
        createdAt: string;
        orderNumber: string;
      }>;
      lastMessageAt: string;
      unreadCount: number;
    }
  >();

  for (const msg of messages) {
    const customer = msg.order.customer;
    if (!customer) continue;

    if (!conversationMap.has(customer.id)) {
      conversationMap.set(customer.id, {
        customer,
        messages: [],
        lastMessageAt: msg.createdAt.toISOString(),
        unreadCount: 0,
      });
    }

    const conv = conversationMap.get(customer.id)!;
    conv.messages.push({
      id: msg.id,
      senderType: msg.senderType,
      message: msg.message,
      createdAt: msg.createdAt.toISOString(),
      orderNumber: msg.order.orderNumber,
    });

    // Count unread (customer messages within last 24h)
    if (msg.senderType === "customer") {
      const hoursSinceMessage =
        (Date.now() - msg.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceMessage < 24) {
        conv.unreadCount++;
      }
    }
  }

  return Array.from(conversationMap.values()).sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() -
      new Date(a.lastMessageAt).getTime()
  );
}

// ---------------------------------------------------------------------------
// Send SMS Reply to Customer
// ---------------------------------------------------------------------------

const replySchema = z.object({
  customerId: z.string().min(1),
  message: z.string().min(1).max(1600),
});

export async function sendSmsReply(data: z.infer<typeof replySchema>) {
  const session = await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();
  const parsed = replySchema.parse(data);

  // Get customer phone
  const customer = await prisma.user.findFirst({
    where: {
      id: parsed.customerId,
      tenantId: tenant.id,
      role: "customer",
    },
    select: { phone: true, id: true },
  });

  if (!customer?.phone) throw new Error("Customer phone number not found");

  // Find the customer's most recent order to link the message
  const recentOrder = await prisma.order.findFirst({
    where: {
      customerId: parsed.customerId,
      tenantId: tenant.id,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!recentOrder) throw new Error("No order found for this customer");

  // Send SMS
  const result = await sendSms({
    to: customer.phone,
    body: `${tenant.businessName}: ${parsed.message}`,
  });

  if (!result.success) {
    throw new Error(result.error ?? "Failed to send SMS");
  }

  // Save the message as an order message
  await prisma.orderMessage.create({
    data: {
      orderId: recentOrder.id,
      senderType: "staff",
      senderId: session.user.id,
      message: parsed.message,
      channel: "sms",
    },
  });

  // Log the notification
  await prisma.notificationLog.create({
    data: {
      userId: parsed.customerId,
      channel: "sms",
      recipient: customer.phone,
      templateName: "manual_reply",
      body: parsed.message,
      status: "sent",
      externalId: result.messageId,
    },
  });

  revalidatePath("/dashboard/sms-inbox");
  return { success: true };
}
