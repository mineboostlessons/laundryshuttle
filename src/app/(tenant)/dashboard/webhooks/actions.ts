"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { generateWebhookSecret, sendTestWebhook, WEBHOOK_EVENTS } from "@/lib/webhooks";
import { z } from "zod";

const createEndpointSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  events: z.array(z.string()).min(1, "Select at least one event"),
});

export async function getWebhookEndpoints() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  return prisma.webhookEndpoint.findMany({
    where: { tenantId: tenant.id },
    include: {
      _count: { select: { deliveryLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createWebhookEndpoint(data: z.infer<typeof createEndpointSchema>) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const result = createEndpointSchema.safeParse(data);
  if (!result.success) {
    return { success: false as const, error: result.error.errors[0].message };
  }
  const validated = result.data;
  const secret = generateWebhookSecret();

  return prisma.webhookEndpoint.create({
    data: {
      tenantId: tenant.id,
      url: validated.url,
      events: validated.events,
      secret,
      isActive: true,
    },
    include: {
      _count: { select: { deliveryLogs: true } },
    },
  });
}

const updateEndpointSchema = z.object({
  url: z.string().url("Must be a valid URL").optional(),
  events: z.array(z.string()).min(1, "Select at least one event").optional(),
  isActive: z.boolean().optional(),
});

export async function updateWebhookEndpoint(
  endpointId: string,
  data: z.infer<typeof updateEndpointSchema>
) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const result = updateEndpointSchema.safeParse(data);
  if (!result.success) {
    return { success: false as const, error: result.error.errors[0].message };
  }
  const validated = result.data;

  return prisma.webhookEndpoint.update({
    where: { id: endpointId, tenantId: tenant.id },
    data: {
      ...(validated.url && { url: validated.url }),
      ...(validated.events && { events: validated.events }),
      ...(validated.isActive !== undefined && { isActive: validated.isActive }),
    },
    include: {
      _count: { select: { deliveryLogs: true } },
    },
  });
}

export async function deleteWebhookEndpoint(endpointId: string) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  return prisma.webhookEndpoint.delete({
    where: { id: endpointId, tenantId: tenant.id },
  });
}

export async function testWebhookEndpoint(endpointId: string) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id: endpointId, tenantId: tenant.id },
  });

  if (!endpoint) {
    throw new Error("Endpoint not found");
  }

  return sendTestWebhook({
    endpointId: endpoint.id,
    url: endpoint.url,
    secret: endpoint.secret,
    tenantId: tenant.id,
  });
}

export async function getDeliveryLogs(endpointId: string) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  // Verify endpoint belongs to tenant
  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id: endpointId, tenantId: tenant.id },
  });

  if (!endpoint) {
    return [];
  }

  return prisma.webhookDeliveryLog.findMany({
    where: { endpointId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getAvailableEvents() {
  return [...WEBHOOK_EVENTS];
}
