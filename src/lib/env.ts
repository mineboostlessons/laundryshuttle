import { z } from "zod";

// =============================================================================
// Environment Variable Validation
// =============================================================================
// Validates all required environment variables at startup.
// Import this in server-side code to get typed, validated env vars.
// =============================================================================

const serverSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_URL_UNPOOLED: z.string().optional(),

  // Auth
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url().optional(),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CONNECT_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PLATFORM_FEE_PERCENT: z.string().optional(),

  // Mapbox
  MAPBOX_SECRET_TOKEN: z.string().optional(),

  // Telnyx
  TELNYX_API_KEY: z.string().optional(),
  TELNYX_MESSAGING_PROFILE_ID: z.string().optional(),
  TELNYX_PHONE_NUMBER: z.string().optional(),
  TELNYX_WEBHOOK_SECRET: z.string().optional(),

  // AWS SES
  AWS_SES_REGION: z.string().optional(),
  AWS_SES_ACCESS_KEY_ID: z.string().optional(),
  AWS_SES_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SES_FROM_EMAIL: z.string().optional(),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),

  // Firebase
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // Sentry
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Cron
  CRON_SECRET: z.string().optional(),

  // Seed
  PLATFORM_ADMIN_EMAIL: z.string().optional(),
  PLATFORM_ADMIN_PASSWORD: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().min(1, "NEXT_PUBLIC_APP_URL is required"),
  NEXT_PUBLIC_APP_NAME: z.string().optional(),
  NEXT_PUBLIC_PLATFORM_DOMAIN: z.string().min(1, "NEXT_PUBLIC_PLATFORM_DOMAIN is required"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

// Lazy validation — only runs when accessed
let _serverEnv: ServerEnv | null = null;
let _clientEnv: ClientEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (_serverEnv) return _serverEnv;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const missing = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
      .join("\n");
    console.error(`[env] Missing or invalid server environment variables:\n${missing}`);
    throw new Error(`Invalid server environment variables:\n${missing}`);
  }

  _serverEnv = parsed.data;
  return _serverEnv;
}

export function getClientEnv(): ClientEnv {
  if (_clientEnv) return _clientEnv;

  const clientVars: Record<string, string | undefined> = {};
  for (const key of clientSchema.keyof().options) {
    clientVars[key] = process.env[key];
  }

  const parsed = clientSchema.safeParse(clientVars);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const missing = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
      .join("\n");
    console.error(`[env] Missing or invalid client environment variables:\n${missing}`);
    throw new Error(`Invalid client environment variables:\n${missing}`);
  }

  _clientEnv = parsed.data;
  return _clientEnv;
}

// =============================================================================
// Production readiness checks — used by health/status endpoints
// =============================================================================

export interface EnvCheckResult {
  name: string;
  category: string;
  configured: boolean;
  required: boolean;
}

export function checkEnvironmentVariables(): EnvCheckResult[] {
  const checks: EnvCheckResult[] = [
    // Required
    { name: "DATABASE_URL", category: "Database", configured: !!process.env.DATABASE_URL, required: true },
    { name: "NEXTAUTH_SECRET", category: "Auth", configured: !!process.env.NEXTAUTH_SECRET, required: true },
    { name: "STRIPE_SECRET_KEY", category: "Payments", configured: !!process.env.STRIPE_SECRET_KEY, required: true },
    { name: "NEXT_PUBLIC_APP_URL", category: "App", configured: !!process.env.NEXT_PUBLIC_APP_URL, required: true },
    { name: "NEXT_PUBLIC_PLATFORM_DOMAIN", category: "App", configured: !!process.env.NEXT_PUBLIC_PLATFORM_DOMAIN, required: true },

    // Important
    { name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", category: "Payments", configured: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, required: false },
    { name: "STRIPE_WEBHOOK_SECRET", category: "Payments", configured: !!process.env.STRIPE_WEBHOOK_SECRET, required: false },
    { name: "STRIPE_CONNECT_WEBHOOK_SECRET", category: "Payments", configured: !!process.env.STRIPE_CONNECT_WEBHOOK_SECRET, required: false },
    { name: "GOOGLE_CLIENT_ID", category: "OAuth", configured: !!process.env.GOOGLE_CLIENT_ID, required: false },
    { name: "FACEBOOK_CLIENT_ID", category: "OAuth", configured: !!process.env.FACEBOOK_CLIENT_ID, required: false },
    { name: "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", category: "Maps", configured: !!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN, required: false },
    { name: "MAPBOX_SECRET_TOKEN", category: "Maps", configured: !!process.env.MAPBOX_SECRET_TOKEN, required: false },
    { name: "TELNYX_API_KEY", category: "SMS", configured: !!process.env.TELNYX_API_KEY, required: false },
    { name: "AWS_SES_ACCESS_KEY_ID", category: "Email", configured: !!process.env.AWS_SES_ACCESS_KEY_ID, required: false },
    { name: "R2_ACCESS_KEY_ID", category: "Storage", configured: !!process.env.R2_ACCESS_KEY_ID, required: false },
    { name: "FIREBASE_PROJECT_ID", category: "Push", configured: !!process.env.FIREBASE_PROJECT_ID, required: false },
    { name: "NEXT_PUBLIC_SENTRY_DSN", category: "Monitoring", configured: !!process.env.NEXT_PUBLIC_SENTRY_DSN, required: false },
    { name: "CRON_SECRET", category: "Cron", configured: !!process.env.CRON_SECRET, required: false },
  ];

  return checks;
}
