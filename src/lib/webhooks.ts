import crypto from "crypto";
import prisma from "./prisma";

// =============================================================================
// Outgoing Webhook System
// =============================================================================

/** Supported webhook events that tenants can subscribe to */
export const WEBHOOK_EVENTS = [
  "order.created",
  "order.confirmed",
  "order.completed",
  "order.cancelled",
  "customer.created",
  "customer.updated",
  "invoice.created",
  "invoice.sent",
  "invoice.paid",
  "payment.received",
  "delivery.completed",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  tenantId: string;
  data: Record<string, unknown>;
}

// =============================================================================
// HMAC Signing
// =============================================================================

/**
 * Generate HMAC-SHA256 signature for a webhook payload.
 */
function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

/**
 * Generate a random webhook signing secret.
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString("hex")}`;
}

// =============================================================================
// Webhook Delivery
// =============================================================================

/**
 * Deliver a webhook to a single endpoint.
 * Returns the delivery result for logging.
 */
async function deliverWebhook(params: {
  endpointId: string;
  url: string;
  secret: string;
  payload: WebhookPayload;
}): Promise<{
  success: boolean;
  statusCode: number | null;
  responseBody: string | null;
}> {
  const body = JSON.stringify(params.payload);
  const signature = signPayload(body, params.secret);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(params.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": timestamp,
        "X-Webhook-Event": params.payload.event,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseBody = await response.text().catch(() => null);
    const success = response.status >= 200 && response.status < 300;

    // Log delivery
    await prisma.webhookDeliveryLog.create({
      data: {
        endpointId: params.endpointId,
        event: params.payload.event,
        payload: JSON.parse(JSON.stringify(params.payload)),
        statusCode: response.status,
        responseBody: responseBody?.slice(0, 1000) ?? null,
        success,
      },
    });

    // Update endpoint status
    if (success) {
      await prisma.webhookEndpoint.update({
        where: { id: params.endpointId },
        data: {
          lastTriggeredAt: new Date(),
          failureCount: 0,
        },
      });
    } else {
      await prisma.webhookEndpoint.update({
        where: { id: params.endpointId },
        data: {
          failureCount: { increment: 1 },
        },
      });
    }

    return { success, statusCode: response.status, responseBody };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await prisma.webhookDeliveryLog.create({
      data: {
        endpointId: params.endpointId,
        event: params.payload.event,
        payload: JSON.parse(JSON.stringify(params.payload)),
        statusCode: null,
        responseBody: errorMessage,
        success: false,
      },
    });

    await prisma.webhookEndpoint.update({
      where: { id: params.endpointId },
      data: {
        failureCount: { increment: 1 },
      },
    });

    return { success: false, statusCode: null, responseBody: errorMessage };
  }
}

// =============================================================================
// Trigger Webhooks
// =============================================================================

/**
 * Fire a webhook event for a tenant. Delivers to all active endpoints
 * subscribed to the event. Non-blocking (fire-and-forget).
 */
export async function triggerWebhook(params: {
  tenantId: string;
  event: WebhookEvent;
  data: Record<string, unknown>;
}): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      tenantId: params.tenantId,
      isActive: true,
      failureCount: { lt: 10 }, // Disable after 10 consecutive failures
    },
  });

  const payload: WebhookPayload = {
    event: params.event,
    timestamp: new Date().toISOString(),
    tenantId: params.tenantId,
    data: params.data,
  };

  // Filter endpoints that subscribe to this event
  const matchingEndpoints = endpoints.filter((ep) => {
    const events = ep.events as string[];
    return events.includes(params.event) || events.includes("*");
  });

  // Deliver to all matching endpoints (fire-and-forget)
  await Promise.allSettled(
    matchingEndpoints.map((ep) =>
      deliverWebhook({
        endpointId: ep.id,
        url: ep.url,
        secret: ep.secret,
        payload,
      })
    )
  );
}

// =============================================================================
// Retry Failed Webhooks
// =============================================================================

/**
 * Retry failed webhook deliveries from the last 24 hours.
 * Called by the cron job.
 */
export async function retryFailedWebhooks(): Promise<{
  retried: number;
  succeeded: number;
}> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find failed deliveries from the last 24 hours
  const failedLogs = await prisma.webhookDeliveryLog.findMany({
    where: {
      success: false,
      createdAt: { gte: oneDayAgo },
    },
    include: {
      endpoint: true,
    },
    orderBy: { createdAt: "asc" },
    take: 100, // Process in batches
  });

  let retried = 0;
  let succeeded = 0;

  for (const log of failedLogs) {
    if (!log.endpoint.isActive || log.endpoint.failureCount >= 10) continue;

    const result = await deliverWebhook({
      endpointId: log.endpoint.id,
      url: log.endpoint.url,
      secret: log.endpoint.secret,
      payload: log.payload as unknown as WebhookPayload,
    });

    retried++;
    if (result.success) succeeded++;
  }

  return { retried, succeeded };
}

/**
 * Send a test webhook to verify endpoint connectivity.
 */
export async function sendTestWebhook(params: {
  endpointId: string;
  url: string;
  secret: string;
  tenantId: string;
}): Promise<{
  success: boolean;
  statusCode: number | null;
  responseBody: string | null;
}> {
  return deliverWebhook({
    endpointId: params.endpointId,
    url: params.url,
    secret: params.secret,
    payload: {
      event: "order.created",
      timestamp: new Date().toISOString(),
      tenantId: params.tenantId,
      data: {
        _test: true,
        orderId: "test_order_123",
        orderNumber: "TEST-2026-00001",
        status: "pending",
        totalAmount: 49.99,
      },
    },
  });
}
