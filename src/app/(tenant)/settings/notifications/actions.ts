"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import type { NotificationEvent } from "@/lib/notifications";

// =============================================================================
// Get Notification Settings
// =============================================================================

export async function getNotificationSettings() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const tenantFull = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      notificationSettings: true,
    },
  });

  const settings = (tenantFull?.notificationSettings as {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    pushEnabled?: boolean;
    smsBudgetCap?: number;
  } | null) ?? {
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: true,
  };

  return settings;
}

// =============================================================================
// Update Notification Settings
// =============================================================================

const updateSettingsSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  smsBudgetCap: z.number().min(0).optional(),
});

export async function updateNotificationSettings(
  input: z.infer<typeof updateSettingsSchema>
) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const parsed = updateSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0].message };
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      notificationSettings: parsed.data,
    },
  });

  return { success: true as const };
}

// =============================================================================
// List Notification Templates
// =============================================================================

export async function getNotificationTemplates() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  return prisma.notificationTemplate.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ name: "asc" }, { channel: "asc" }],
  });
}

// =============================================================================
// Create / Update Notification Template
// =============================================================================

const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  channel: z.enum(["email", "sms", "push"]),
  subject: z.string().optional(),
  body: z.string().min(1),
  isActive: z.boolean().default(true),
});

export async function upsertNotificationTemplate(
  input: z.infer<typeof templateSchema>
) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0].message };
  }

  const { id, ...data } = parsed.data;

  if (id) {
    // Update existing
    const existing = await prisma.notificationTemplate.findFirst({
      where: { id, tenantId: tenant.id },
    });
    if (!existing) {
      return { success: false as const, error: "Template not found" };
    }

    await prisma.notificationTemplate.update({
      where: { id },
      data,
    });
  } else {
    // Create new
    await prisma.notificationTemplate.create({
      data: {
        tenantId: tenant.id,
        ...data,
      },
    });
  }

  return { success: true as const };
}

// =============================================================================
// Delete Notification Template
// =============================================================================

export async function deleteNotificationTemplate(id: string) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const template = await prisma.notificationTemplate.findFirst({
    where: { id, tenantId: tenant.id },
  });

  if (!template) {
    return { success: false as const, error: "Template not found" };
  }

  await prisma.notificationTemplate.delete({
    where: { id },
  });

  return { success: true as const };
}

// =============================================================================
// Seed Default Templates
// =============================================================================

const DEFAULT_TEMPLATES: Array<{
  name: NotificationEvent;
  channel: "email" | "sms" | "push";
  subject?: string;
  body: string;
}> = [
  {
    name: "order_confirmed",
    channel: "email",
    subject: "Order {{orderNumber}} Confirmed",
    body: "<p>Hi {{customerName}},</p><p>Your order <strong>{{orderNumber}}</strong> has been confirmed. Total: <strong>{{total}}</strong>.</p><p>We'll notify you when it's ready.</p>",
  },
  {
    name: "order_confirmed",
    channel: "sms",
    body: "{{businessName}}: Order {{orderNumber}} confirmed. Total: {{total}}. We'll keep you updated!",
  },
  {
    name: "order_ready",
    channel: "email",
    subject: "Order {{orderNumber}} is Ready!",
    body: "<p>Hi {{customerName}},</p><p>Great news! Your order <strong>{{orderNumber}}</strong> is ready.</p>",
  },
  {
    name: "order_ready",
    channel: "sms",
    body: "{{businessName}}: Order {{orderNumber}} is ready!",
  },
  {
    name: "order_completed",
    channel: "email",
    subject: "Order {{orderNumber}} Complete",
    body: "<p>Hi {{customerName}},</p><p>Your order <strong>{{orderNumber}}</strong> is complete. Total: <strong>{{total}}</strong>.</p><p>Thank you for your business!</p>",
  },
  {
    name: "order_completed",
    channel: "sms",
    body: "{{businessName}}: Order {{orderNumber}} complete. Total: {{total}}. Thank you!",
  },
  {
    name: "driver_en_route",
    channel: "email",
    subject: "Your Driver is On the Way",
    body: "<p>Hi {{customerName}},</p><p>Your driver is on the way with order <strong>{{orderNumber}}</strong>.</p>",
  },
  {
    name: "driver_en_route",
    channel: "sms",
    body: "{{businessName}}: Your driver is on the way with order {{orderNumber}}!",
  },
  {
    name: "delivery_completed",
    channel: "email",
    subject: "Order {{orderNumber}} Delivered",
    body: "<p>Hi {{customerName}},</p><p>Your order <strong>{{orderNumber}}</strong> has been delivered. Thank you for choosing {{businessName}}!</p>",
  },
  {
    name: "delivery_completed",
    channel: "sms",
    body: "{{businessName}}: Order {{orderNumber}} delivered. Thank you!",
  },
  {
    name: "payment_received",
    channel: "email",
    subject: "Payment Received - {{orderNumber}}",
    body: "<p>Hi {{customerName}},</p><p>We've received your payment of <strong>{{total}}</strong> for order <strong>{{orderNumber}}</strong>.</p>",
  },
  {
    name: "payment_received",
    channel: "sms",
    body: "{{businessName}}: Payment of {{total}} received for order {{orderNumber}}.",
  },
];

export async function seedDefaultTemplates() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  // Check if templates already exist
  const existing = await prisma.notificationTemplate.count({
    where: { tenantId: tenant.id },
  });

  if (existing > 0) {
    return {
      success: false as const,
      error: "Templates already exist. Delete existing templates first to re-seed.",
    };
  }

  await prisma.notificationTemplate.createMany({
    data: DEFAULT_TEMPLATES.map((t) => ({
      tenantId: tenant.id,
      ...t,
    })),
  });

  return { success: true as const, count: DEFAULT_TEMPLATES.length };
}
