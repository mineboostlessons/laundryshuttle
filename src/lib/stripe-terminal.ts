import { stripe } from "./stripe";
import type Stripe from "stripe";

// =============================================================================
// Stripe Terminal — Location Management
// =============================================================================

/**
 * Create a Stripe Terminal Location (maps to a Laundromat).
 * Each physical location needs a Terminal Location for reader registration.
 */
export async function createTerminalLocation(params: {
  displayName: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  connectedAccountId: string;
}): Promise<Stripe.Terminal.Location> {
  return stripe.terminal.locations.create(
    {
      display_name: params.displayName,
      address: {
        line1: params.address.line1,
        line2: params.address.line2,
        city: params.address.city,
        state: params.address.state,
        postal_code: params.address.postalCode,
        country: params.address.country ?? "US",
      },
    },
    { stripeAccount: params.connectedAccountId }
  );
}

/**
 * List Terminal Locations for a connected account.
 */
export async function listTerminalLocations(
  connectedAccountId: string
): Promise<Stripe.Terminal.Location[]> {
  const result = await stripe.terminal.locations.list(
    { limit: 100 },
    { stripeAccount: connectedAccountId }
  );
  return result.data;
}

// =============================================================================
// Stripe Terminal — Connection Token
// =============================================================================

/**
 * Create a connection token for the Terminal JS SDK.
 * Must be called from the server — the SDK uses this to authenticate.
 */
export async function createConnectionToken(
  connectedAccountId: string,
  locationId?: string
): Promise<string> {
  const token = await stripe.terminal.connectionTokens.create(
    locationId ? { location: locationId } : {},
    { stripeAccount: connectedAccountId }
  );
  return token.secret;
}

// =============================================================================
// Stripe Terminal — Reader Management
// =============================================================================

/**
 * Register a new Terminal reader.
 */
export async function registerReader(params: {
  registrationCode: string;
  label: string;
  locationId: string;
  connectedAccountId: string;
}): Promise<Stripe.Terminal.Reader> {
  return stripe.terminal.readers.create(
    {
      registration_code: params.registrationCode,
      label: params.label,
      location: params.locationId,
    },
    { stripeAccount: params.connectedAccountId }
  );
}

/**
 * List Terminal readers for a connected account, optionally filtered by location.
 */
export async function listReaders(params: {
  connectedAccountId: string;
  locationId?: string;
  status?: "online" | "offline";
}): Promise<Stripe.Terminal.Reader[]> {
  const result = await stripe.terminal.readers.list(
    {
      limit: 100,
      ...(params.locationId && { location: params.locationId }),
      ...(params.status && { status: params.status }),
    },
    { stripeAccount: params.connectedAccountId }
  );
  return result.data;
}

// =============================================================================
// Stripe Terminal — Payment Processing
// =============================================================================

/**
 * Create a PaymentIntent for Terminal processing.
 * Uses destination charges with platform fee.
 */
export async function createTerminalPaymentIntent(params: {
  amount: number; // in dollars
  connectedAccountId: string;
  platformFeePercent: number;
  metadata?: Record<string, string>;
}): Promise<Stripe.PaymentIntent> {
  const amountInCents = Math.round(params.amount * 100);
  const platformFee = Math.round(amountInCents * params.platformFeePercent);

  return stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    payment_method_types: ["card_present"],
    capture_method: "automatic",
    application_fee_amount: platformFee,
    transfer_data: {
      destination: params.connectedAccountId,
    },
    metadata: params.metadata ?? {},
  });
}

/**
 * Process a payment on a Terminal reader (server-driven).
 * This tells a specific reader to collect a card payment.
 */
export async function processPaymentOnReader(params: {
  readerId: string;
  paymentIntentId: string;
  connectedAccountId: string;
}): Promise<Stripe.Terminal.Reader> {
  return stripe.terminal.readers.processPaymentIntent(
    params.readerId,
    { payment_intent: params.paymentIntentId },
    { stripeAccount: params.connectedAccountId }
  );
}

/**
 * Cancel the current reader action (e.g., cancel a pending payment).
 */
export async function cancelReaderAction(params: {
  readerId: string;
  connectedAccountId: string;
}): Promise<Stripe.Terminal.Reader> {
  return stripe.terminal.readers.cancelAction(params.readerId, {
    stripeAccount: params.connectedAccountId,
  });
}

/**
 * Capture a Terminal payment intent (if capture_method is "manual").
 */
export async function captureTerminalPayment(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.capture(paymentIntentId);
}
