import Stripe from "stripe";

// =============================================================================
// Stripe Client Singleton
// =============================================================================

const globalForStripe = globalThis as unknown as { stripe: Stripe | undefined };

export const stripe =
  globalForStripe.stripe ??
  new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForStripe.stripe = stripe;
}

// =============================================================================
// Stripe Connect — Account Management
// =============================================================================

/**
 * Create a Stripe Connect Express account for a tenant.
 */
export async function createConnectAccount(params: {
  email: string;
  businessName: string;
  tenantId: string;
}): Promise<Stripe.Account> {
  return stripe.accounts.create({
    type: "express",
    email: params.email,
    business_type: "company",
    company: {
      name: params.businessName,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      tenantId: params.tenantId,
    },
  });
}

/**
 * Create an account link for Stripe Connect onboarding.
 */
export async function createAccountLink(params: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<Stripe.AccountLink> {
  return stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding",
  });
}

/**
 * Retrieve Connect account details.
 */
export async function getConnectAccount(
  accountId: string
): Promise<Stripe.Account> {
  return stripe.accounts.retrieve(accountId);
}

/**
 * Create a login link for the Express dashboard.
 */
export async function createDashboardLink(
  accountId: string
): Promise<Stripe.LoginLink> {
  return stripe.accounts.createLoginLink(accountId);
}

// =============================================================================
// Payment Intents — Destination Charges
// =============================================================================

/**
 * Create a payment intent with destination charge (platform fee auto-deducted).
 */
export async function createPaymentIntent(params: {
  amount: number; // in dollars
  connectedAccountId: string;
  platformFeePercent: number;
  customerId?: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.PaymentIntent> {
  const amountInCents = Math.round(params.amount * 100);
  const platformFee = Math.round(amountInCents * params.platformFeePercent);

  return stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    payment_method_types: ["card"],
    customer: params.customerId,
    payment_method: params.paymentMethodId,
    application_fee_amount: platformFee,
    transfer_data: {
      destination: params.connectedAccountId,
    },
    metadata: params.metadata ?? {},
  });
}

/**
 * Confirm a payment intent (server-side confirmation).
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: paymentMethodId,
  });
}

/**
 * Retrieve a payment intent.
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

// =============================================================================
// Customers
// =============================================================================

/**
 * Create a Stripe customer on the platform account.
 */
export async function createStripeCustomer(params: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer> {
  return stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: params.metadata ?? {},
  });
}

/**
 * Attach a payment method to a customer.
 */
export async function attachPaymentMethod(
  paymentMethodId: string,
  customerId: string
): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
}

/**
 * List a customer's payment methods.
 */
export async function listPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  const result = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });
  return result.data;
}

/**
 * Detach a payment method from a customer.
 */
export async function detachPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.detach(paymentMethodId);
}

// =============================================================================
// Refunds
// =============================================================================

/**
 * Create a full or partial refund for a payment intent.
 */
export async function createRefund(params: {
  paymentIntentId: string;
  amount?: number; // in dollars — omit for full refund
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
}): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: params.paymentIntentId,
    amount: params.amount ? Math.round(params.amount * 100) : undefined,
    reason: params.reason,
    reverse_transfer: true,
    refund_application_fee: true,
  });
}

/**
 * Retrieve a refund.
 */
export async function getRefund(refundId: string): Promise<Stripe.Refund> {
  return stripe.refunds.retrieve(refundId);
}

// =============================================================================
// Setup Intents (for saving payment methods)
// =============================================================================

/**
 * Create a setup intent for saving a card without charging.
 */
export async function createSetupIntent(
  customerId: string
): Promise<Stripe.SetupIntent> {
  return stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
  });
}

// =============================================================================
// Webhook Verification
// =============================================================================

/**
 * Verify and construct a webhook event.
 */
export function constructWebhookEvent(
  body: string,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(body, signature, secret);
}

// =============================================================================
// Stripe Invoicing — Commercial B2B
// =============================================================================

/**
 * Create a Stripe customer on a connected account (for commercial accounts).
 */
export async function createCustomerOnConnectedAccount(params: {
  connectedAccountId: string;
  email: string;
  name: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer> {
  return stripe.customers.create(
    {
      email: params.email,
      name: params.name,
      metadata: params.metadata ?? {},
    },
    { stripeAccount: params.connectedAccountId }
  );
}

/**
 * Create an invoice item on a connected account.
 */
export async function createStripeInvoiceItem(params: {
  connectedAccountId: string;
  customerId: string;
  amount: number; // in dollars
  description: string;
  invoiceId?: string;
}): Promise<Stripe.InvoiceItem> {
  return stripe.invoiceItems.create(
    {
      customer: params.customerId,
      amount: Math.round(params.amount * 100),
      currency: "usd",
      description: params.description,
      invoice: params.invoiceId,
    },
    { stripeAccount: params.connectedAccountId }
  );
}

/**
 * Create a draft invoice on a connected account.
 */
export async function createStripeInvoice(params: {
  connectedAccountId: string;
  customerId: string;
  daysUntilDue?: number;
  collectionMethod?: "charge_automatically" | "send_invoice";
  metadata?: Record<string, string>;
}): Promise<Stripe.Invoice> {
  return stripe.invoices.create(
    {
      customer: params.customerId,
      collection_method: params.collectionMethod ?? "send_invoice",
      days_until_due: params.daysUntilDue ?? 30,
      metadata: params.metadata ?? {},
    },
    { stripeAccount: params.connectedAccountId }
  );
}

/**
 * Finalize and send a Stripe invoice to the customer.
 */
export async function sendStripeInvoice(params: {
  connectedAccountId: string;
  invoiceId: string;
}): Promise<Stripe.Invoice> {
  // Finalize the draft invoice first
  const finalized = await stripe.invoices.finalizeInvoice(
    params.invoiceId,
    {},
    { stripeAccount: params.connectedAccountId }
  );
  // Send the invoice email via Stripe
  return stripe.invoices.sendInvoice(params.invoiceId, {
    stripeAccount: params.connectedAccountId,
  });
}

/**
 * Void a Stripe invoice (can only void finalized invoices).
 */
export async function voidStripeInvoice(params: {
  connectedAccountId: string;
  invoiceId: string;
}): Promise<Stripe.Invoice> {
  return stripe.invoices.voidInvoice(params.invoiceId, {
    stripeAccount: params.connectedAccountId,
  });
}

/**
 * Mark a Stripe invoice as paid (for offline/ACH payments).
 */
export async function markStripeInvoicePaid(params: {
  connectedAccountId: string;
  invoiceId: string;
}): Promise<Stripe.Invoice> {
  return stripe.invoices.pay(
    params.invoiceId,
    { paid_out_of_band: true },
    { stripeAccount: params.connectedAccountId }
  );
}

/**
 * Retrieve a Stripe invoice from a connected account.
 */
export async function getStripeInvoice(params: {
  connectedAccountId: string;
  invoiceId: string;
}): Promise<Stripe.Invoice> {
  return stripe.invoices.retrieve(params.invoiceId, {
    stripeAccount: params.connectedAccountId,
  });
}
