import Telnyx from "telnyx";

// =============================================================================
// Telnyx — SMS Helper
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TelnyxClient = any;

const globalForTelnyx = globalThis as unknown as {
  telnyx: TelnyxClient | undefined;
};

function getTelnyxClient(): TelnyxClient {
  if (globalForTelnyx.telnyx) return globalForTelnyx.telnyx;
  const client = new (Telnyx as unknown as new (key: string) => TelnyxClient)(process.env.TELNYX_API_KEY!);
  if (process.env.NODE_ENV !== "production") {
    globalForTelnyx.telnyx = client;
  }
  return client;
}

export const telnyx = new Proxy({} as TelnyxClient, {
  get(_target, prop) {
    return getTelnyxClient()[prop];
  },
});

const FROM_NUMBER = process.env.TELNYX_PHONE_NUMBER!;
const MESSAGING_PROFILE_ID = process.env.TELNYX_MESSAGING_PROFILE_ID!;

// =============================================================================
// Send SMS
// =============================================================================

export interface SendSmsParams {
  to: string;
  body: string;
  from?: string;
  messagingProfileId?: string;
}

/**
 * Normalize a phone number to E.164 format (+1XXXXXXXXXX).
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+${cleaned}`;
  }
  if (phone.startsWith("+")) {
    return phone;
  }
  return `+${cleaned}`;
}

/**
 * Send an SMS message via Telnyx.
 * Returns the Telnyx message ID on success.
 */
export async function sendSms(params: SendSmsParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const to = normalizePhone(params.to);

  // Basic validation
  const cleaned = to.replace(/\D/g, "");
  if (cleaned.length < 10 || cleaned.length > 15) {
    return { success: false, error: "Invalid phone number" };
  }

  try {
    const message = await telnyx.messages.create({
      from: params.from ?? FROM_NUMBER,
      to,
      text: params.body,
      messaging_profile_id: params.messagingProfileId ?? MESSAGING_PROFILE_ID,
    });

    return {
      success: true,
      messageId: (message.data as { id?: string })?.id,
    };
  } catch (error) {
    console.error("Telnyx send SMS error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send SMS",
    };
  }
}

/**
 * Send SMS to multiple recipients.
 */
export async function sendBulkSms(
  recipients: string[],
  body: string
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const to of recipients) {
    const result = await sendSms({ to, body });
    if (result.success) {
      sent++;
    } else {
      failed++;
      if (result.error) errors.push(`${to}: ${result.error}`);
    }
  }

  return { sent, failed, errors };
}

/**
 * Render an SMS template by replacing {{merge_tags}} with values.
 */
export function renderSmsTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, "g"),
      value
    );
  }
  return rendered;
}

// =============================================================================
// Webhook Verification
// =============================================================================

/**
 * Verify a Telnyx webhook signature.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  const crypto = require("crypto") as typeof import("crypto");
  const secret = process.env.TELNYX_WEBHOOK_SECRET!;
  const signedPayload = `${timestamp}|${payload}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return signature === expectedSignature;
}
