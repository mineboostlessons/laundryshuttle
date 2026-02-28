import prisma from "./prisma";
import { sendEmail, renderEmailTemplate, wrapInEmailLayout } from "./ses";
import { sendSms, renderSmsTemplate } from "./telnyx";
import { sendPushNotification } from "./firebase";
import { formatCurrency } from "./utils";

// =============================================================================
// Notification Dispatch System
// =============================================================================

/** Well-known notification event names */
export type NotificationEvent =
  | "order_confirmed"
  | "order_ready"
  | "order_completed"
  | "order_out_for_delivery"
  | "driver_en_route"
  | "delivery_completed"
  | "payment_received"
  | "order_cancelled"
  | "pickup_reminder"
  | "subscription_renewal"
  | "promo_available"
  | "invoice_created"
  | "invoice_sent"
  | "invoice_paid"
  | "invoice_overdue"
  | "driver_zone_assigned"
  | "driver_zone_unassigned";

export interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  smsBudgetCap?: number;
}

export interface SendNotificationParams {
  tenantId: string;
  userId?: string;
  event: NotificationEvent;
  channels?: ("email" | "sms" | "push")[];
  recipientEmail?: string;
  recipientPhone?: string;
  recipientPushToken?: string;
  variables: Record<string, string>;
}

interface NotificationResult {
  email?: { success: boolean; messageId?: string; error?: string };
  sms?: { success: boolean; messageId?: string; error?: string };
  push?: { success: boolean; messageId?: string; error?: string };
}

// =============================================================================
// Main Dispatch Function
// =============================================================================

/**
 * Send a notification across all configured channels.
 * Resolves templates, user preferences, and tenant settings automatically.
 */
export async function sendNotification(
  params: SendNotificationParams
): Promise<NotificationResult> {
  const result: NotificationResult = {};

  // Load tenant notification settings
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    select: {
      businessName: true,
      notificationSettings: true,
    },
  });

  if (!tenant) return result;

  const settings = (tenant.notificationSettings as NotificationSettings | null) ?? {
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: true,
  };

  // Load user preferences + contact info if userId is provided
  let userPreference = "both";
  let email = params.recipientEmail;
  let phone = params.recipientPhone;
  let pushToken = params.recipientPushToken;

  if (params.userId) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        email: true,
        phone: true,
        notificationPreference: true,
      },
    });

    if (user) {
      userPreference = user.notificationPreference;
      email = email ?? user.email;
      phone = phone ?? user.phone ?? undefined;
    }
  }

  // Determine which channels to use
  const channels = params.channels ?? resolveChannels(userPreference, settings);

  // Add business name to variables
  const variables = {
    ...params.variables,
    businessName: tenant.businessName,
  };

  // Load templates for each channel
  const templates = await prisma.notificationTemplate.findMany({
    where: {
      tenantId: params.tenantId,
      name: params.event,
      isActive: true,
    },
  });

  // Send via each channel
  for (const channel of channels) {
    const template = templates.find((t) => t.channel === channel);

    if (channel === "email" && settings.emailEnabled && email) {
      result.email = await sendEmailNotification({
        to: email,
        template,
        variables,
        event: params.event,
        businessName: tenant.businessName,
      });

      await logNotification({
        userId: params.userId,
        channel: "email",
        recipient: email,
        templateName: params.event,
        subject: template?.subject ?? getDefaultSubject(params.event),
        body: template?.body,
        status: result.email.success ? "sent" : "failed",
        externalId: result.email.messageId,
      });
    }

    if (channel === "sms" && settings.smsEnabled && phone) {
      result.sms = await sendSmsNotification({
        to: phone,
        template,
        variables,
        event: params.event,
        businessName: tenant.businessName,
      });

      await logNotification({
        userId: params.userId,
        channel: "sms",
        recipient: phone,
        templateName: params.event,
        body: template?.body,
        status: result.sms.success ? "sent" : "failed",
        externalId: result.sms.messageId,
      });
    }

    if (channel === "push" && settings.pushEnabled && pushToken) {
      result.push = await sendPushNotificationWrapped({
        token: pushToken,
        template,
        variables,
        event: params.event,
        businessName: tenant.businessName,
      });

      await logNotification({
        userId: params.userId,
        channel: "push",
        recipient: pushToken,
        templateName: params.event,
        body: template?.body,
        status: result.push.success ? "sent" : "failed",
        externalId: result.push.messageId,
      });
    }
  }

  return result;
}

// =============================================================================
// Channel Resolvers
// =============================================================================

function resolveChannels(
  userPreference: string,
  settings: NotificationSettings
): ("email" | "sms" | "push")[] {
  const channels: ("email" | "sms" | "push")[] = [];

  switch (userPreference) {
    case "email":
      if (settings.emailEnabled) channels.push("email");
      break;
    case "sms":
      if (settings.smsEnabled) channels.push("sms");
      break;
    case "push":
      if (settings.pushEnabled) channels.push("push");
      break;
    case "both":
    default:
      if (settings.emailEnabled) channels.push("email");
      if (settings.smsEnabled) channels.push("sms");
      if (settings.pushEnabled) channels.push("push");
      break;
  }

  return channels;
}

// =============================================================================
// Channel-Specific Senders
// =============================================================================

async function sendEmailNotification(params: {
  to: string;
  template: { subject?: string | null; body: string } | undefined;
  variables: Record<string, string>;
  event: NotificationEvent;
  businessName: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const subject = params.template?.subject
    ? renderEmailTemplate(params.template.subject, params.variables)
    : getDefaultSubject(params.event);

  const bodyContent = params.template?.body
    ? renderEmailTemplate(params.template.body, params.variables)
    : getDefaultEmailBody(params.event, params.variables);

  const html = wrapInEmailLayout({
    body: bodyContent,
    businessName: params.businessName,
  });

  return sendEmail({
    to: params.to,
    subject,
    html,
    text: bodyContent.replace(/<[^>]*>/g, ""),
  });
}

async function sendSmsNotification(params: {
  to: string;
  template: { body: string } | undefined;
  variables: Record<string, string>;
  event: NotificationEvent;
  businessName: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const body = params.template?.body
    ? renderSmsTemplate(params.template.body, params.variables)
    : getDefaultSmsBody(params.event, params.variables);

  return sendSms({ to: params.to, body });
}

async function sendPushNotificationWrapped(params: {
  token: string;
  template: { subject?: string | null; body: string } | undefined;
  variables: Record<string, string>;
  event: NotificationEvent;
  businessName: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const title = params.template?.subject
    ? renderEmailTemplate(params.template.subject, params.variables)
    : params.businessName;

  const body = params.template?.body
    ? renderSmsTemplate(params.template.body, params.variables)
    : getDefaultSmsBody(params.event, params.variables);

  return sendPushNotification({
    token: params.token,
    title,
    body,
    data: {
      event: params.event,
      ...params.variables,
    },
  });
}

// =============================================================================
// Notification Logging
// =============================================================================

async function logNotification(params: {
  userId?: string;
  channel: string;
  recipient: string;
  templateName: string;
  subject?: string;
  body?: string;
  status: string;
  externalId?: string;
}): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: {
        userId: params.userId,
        channel: params.channel,
        recipient: params.recipient,
        templateName: params.templateName,
        subject: params.subject,
        body: params.body,
        status: params.status,
        externalId: params.externalId,
      },
    });
  } catch (error) {
    console.error("Failed to log notification:", error);
  }
}

// =============================================================================
// Default Templates (Fallbacks)
// =============================================================================

function getDefaultSubject(event: NotificationEvent): string {
  const subjects: Record<NotificationEvent, string> = {
    order_confirmed: "Your order has been confirmed",
    order_ready: "Your order is ready",
    order_completed: "Your order is complete",
    order_out_for_delivery: "Your order is out for delivery",
    driver_en_route: "Your driver is on the way",
    delivery_completed: "Your order has been delivered",
    payment_received: "Payment received",
    order_cancelled: "Your order has been cancelled",
    pickup_reminder: "Pickup reminder",
    subscription_renewal: "Subscription renewal",
    promo_available: "Special offer for you",
    invoice_created: "New invoice created",
    invoice_sent: "Invoice sent",
    invoice_paid: "Invoice payment received",
    invoice_overdue: "Invoice overdue",
    driver_zone_assigned: "You've been assigned to a zone",
    driver_zone_unassigned: "You've been unassigned from a zone",
  };
  return subjects[event] ?? "Notification";
}

function getDefaultEmailBody(
  event: NotificationEvent,
  vars: Record<string, string>
): string {
  switch (event) {
    case "order_confirmed":
      return `<p>Hi ${vars.customerName ?? "there"},</p>
<p>Your order <strong>${vars.orderNumber}</strong> has been confirmed.</p>
${vars.total ? `<p>Total: <strong>${vars.total}</strong></p>` : ""}
<p>We'll notify you when your order is ready.</p>`;

    case "order_ready":
      return `<p>Hi ${vars.customerName ?? "there"},</p>
<p>Great news! Your order <strong>${vars.orderNumber}</strong> is ready for pickup/delivery.</p>`;

    case "order_completed":
      return `<p>Hi ${vars.customerName ?? "there"},</p>
<p>Your order <strong>${vars.orderNumber}</strong> has been completed.</p>
${vars.total ? `<p>Total charged: <strong>${vars.total}</strong></p>` : ""}
<p>Thank you for your business!</p>`;

    case "delivery_completed":
      return `<p>Hi ${vars.customerName ?? "there"},</p>
<p>Your order <strong>${vars.orderNumber}</strong> has been delivered.</p>
<p>Thank you for choosing ${vars.businessName}!</p>`;

    case "driver_en_route":
    case "order_out_for_delivery":
      return `<p>Hi ${vars.customerName ?? "there"},</p>
<p>Your driver is on the way with order <strong>${vars.orderNumber}</strong>.</p>
${vars.driverName ? `<p>Driver: ${vars.driverName}</p>` : ""}`;

    case "payment_received":
      return `<p>Hi ${vars.customerName ?? "there"},</p>
<p>We've received your payment of <strong>${vars.total}</strong> for order <strong>${vars.orderNumber}</strong>.</p>`;

    case "order_cancelled":
      return `<p>Hi ${vars.customerName ?? "there"},</p>
<p>Your order <strong>${vars.orderNumber}</strong> has been cancelled.</p>
${vars.reason ? `<p>Reason: ${vars.reason}</p>` : ""}`;

    case "pickup_reminder":
      return `<p>Hi ${vars.customerName ?? "there"},</p>
<p>Reminder: Your laundry pickup is scheduled for <strong>${vars.pickupDate}</strong>.</p>`;

    case "subscription_renewal":
      return `<p>Hi ${vars.customerName ?? "there"},</p>
<p>Your subscription will renew on <strong>${vars.renewalDate}</strong>.</p>`;

    case "promo_available":
      return `<p>Hi ${vars.customerName ?? "there"},</p>
<p>We have a special offer for you: <strong>${vars.promoDescription}</strong></p>
${vars.promoCode ? `<p>Use code: <strong>${vars.promoCode}</strong></p>` : ""}`;

    case "invoice_created":
      return `<p>Hi ${vars.contactName ?? "there"},</p>
<p>A new invoice <strong>${vars.invoiceNumber}</strong> has been created for <strong>${vars.companyName}</strong>.</p>
${vars.totalAmount ? `<p>Amount: <strong>${vars.totalAmount}</strong></p>` : ""}`;

    case "invoice_sent":
      return `<p>Hi ${vars.contactName ?? "there"},</p>
<p>Invoice <strong>${vars.invoiceNumber}</strong> for <strong>${vars.totalAmount}</strong> has been sent to <strong>${vars.companyName}</strong>.</p>
<p>Payment is due by <strong>${vars.dueDate}</strong>.</p>`;

    case "invoice_paid":
      return `<p>Hi ${vars.contactName ?? "there"},</p>
<p>Payment of <strong>${vars.totalAmount}</strong> for invoice <strong>${vars.invoiceNumber}</strong> has been received from <strong>${vars.companyName}</strong>.</p>`;

    case "invoice_overdue":
      return `<p>Hi ${vars.contactName ?? "there"},</p>
<p>Invoice <strong>${vars.invoiceNumber}</strong> for <strong>${vars.totalAmount}</strong> from <strong>${vars.companyName}</strong> is now overdue.</p>
<p>Original due date: <strong>${vars.dueDate}</strong>.</p>`;

    case "driver_zone_assigned":
      return `<p>Hi ${vars.driverName ?? "there"},</p>
<p>You've been assigned to the zone <strong>${vars.zoneName}</strong> at ${vars.businessName}.</p>
<p>You will now receive orders from this area.</p>`;

    case "driver_zone_unassigned":
      return `<p>Hi ${vars.driverName ?? "there"},</p>
<p>You've been unassigned from the zone <strong>${vars.zoneName}</strong> at ${vars.businessName}.</p>
<p>You will no longer receive orders from this area.</p>`;

    default:
      return `<p>You have a new notification from ${vars.businessName}.</p>`;
  }
}

function getDefaultSmsBody(
  event: NotificationEvent,
  vars: Record<string, string>
): string {
  const biz = vars.businessName ?? "Laundry Shuttle";

  switch (event) {
    case "order_confirmed":
      return `${biz}: Order ${vars.orderNumber} confirmed. ${vars.total ? `Total: ${vars.total}` : ""}`;

    case "order_ready":
      return `${biz}: Order ${vars.orderNumber} is ready!`;

    case "order_completed":
      return `${biz}: Order ${vars.orderNumber} complete. ${vars.total ? `Total: ${vars.total}.` : ""} Thank you!`;

    case "delivery_completed":
      return `${biz}: Order ${vars.orderNumber} delivered. Thank you!`;

    case "driver_en_route":
    case "order_out_for_delivery":
      return `${biz}: Your driver is on the way with order ${vars.orderNumber}.`;

    case "payment_received":
      return `${biz}: Payment of ${vars.total} received for order ${vars.orderNumber}.`;

    case "order_cancelled":
      return `${biz}: Order ${vars.orderNumber} has been cancelled.`;

    case "pickup_reminder":
      return `${biz}: Reminder - pickup scheduled for ${vars.pickupDate}.`;

    case "subscription_renewal":
      return `${biz}: Your subscription renews on ${vars.renewalDate}.`;

    case "promo_available":
      return `${biz}: ${vars.promoDescription}${vars.promoCode ? ` Use code: ${vars.promoCode}` : ""}`;

    case "invoice_created":
      return `${biz}: Invoice ${vars.invoiceNumber} created for ${vars.companyName}. Amount: ${vars.totalAmount}`;

    case "invoice_sent":
      return `${biz}: Invoice ${vars.invoiceNumber} sent to ${vars.companyName}. Due: ${vars.dueDate}`;

    case "invoice_paid":
      return `${biz}: Payment received for invoice ${vars.invoiceNumber} from ${vars.companyName}.`;

    case "invoice_overdue":
      return `${biz}: Invoice ${vars.invoiceNumber} from ${vars.companyName} is overdue.`;

    case "driver_zone_assigned":
      return `${biz}: You've been assigned to zone "${vars.zoneName}".`;

    case "driver_zone_unassigned":
      return `${biz}: You've been unassigned from zone "${vars.zoneName}".`;

    default:
      return `${biz}: You have a new notification.`;
  }
}

// =============================================================================
// Convenience Functions for Common Events
// =============================================================================

/**
 * Send order confirmation notification to a customer.
 */
export async function notifyOrderConfirmed(params: {
  tenantId: string;
  userId: string;
  orderNumber: string;
  total: number;
  customerName?: string;
}): Promise<NotificationResult> {
  return sendNotification({
    tenantId: params.tenantId,
    userId: params.userId,
    event: "order_confirmed",
    variables: {
      orderNumber: params.orderNumber,
      total: formatCurrency(params.total),
      customerName: params.customerName ?? "",
    },
  });
}

/**
 * Send order completed notification.
 */
export async function notifyOrderCompleted(params: {
  tenantId: string;
  userId: string;
  orderNumber: string;
  total: number;
  customerName?: string;
}): Promise<NotificationResult> {
  return sendNotification({
    tenantId: params.tenantId,
    userId: params.userId,
    event: "order_completed",
    variables: {
      orderNumber: params.orderNumber,
      total: formatCurrency(params.total),
      customerName: params.customerName ?? "",
    },
  });
}

/**
 * Send payment received notification.
 */
export async function notifyPaymentReceived(params: {
  tenantId: string;
  userId: string;
  orderNumber: string;
  total: number;
  customerName?: string;
}): Promise<NotificationResult> {
  return sendNotification({
    tenantId: params.tenantId,
    userId: params.userId,
    event: "payment_received",
    variables: {
      orderNumber: params.orderNumber,
      total: formatCurrency(params.total),
      customerName: params.customerName ?? "",
    },
  });
}

/**
 * Send driver en route notification.
 */
export async function notifyDriverEnRoute(params: {
  tenantId: string;
  userId: string;
  orderNumber: string;
  driverName?: string;
}): Promise<NotificationResult> {
  return sendNotification({
    tenantId: params.tenantId,
    userId: params.userId,
    event: "driver_en_route",
    variables: {
      orderNumber: params.orderNumber,
      driverName: params.driverName ?? "",
    },
  });
}

/**
 * Send delivery completed notification.
 */
export async function notifyDeliveryCompleted(params: {
  tenantId: string;
  userId: string;
  orderNumber: string;
}): Promise<NotificationResult> {
  return sendNotification({
    tenantId: params.tenantId,
    userId: params.userId,
    event: "delivery_completed",
    variables: {
      orderNumber: params.orderNumber,
    },
  });
}

/**
 * Notify a driver about a zone assignment change.
 */
export async function notifyDriverZoneChange(params: {
  tenantId: string;
  driverId: string;
  zoneName: string;
  assigned: boolean;
}): Promise<NotificationResult> {
  return sendNotification({
    tenantId: params.tenantId,
    userId: params.driverId,
    event: params.assigned ? "driver_zone_assigned" : "driver_zone_unassigned",
    variables: {
      zoneName: params.zoneName,
      driverName: "",
    },
  });
}
