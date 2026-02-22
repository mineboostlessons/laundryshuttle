"use server";

import prisma from "@/lib/prisma";

export interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  description: string;
  passed: boolean;
  severity: "critical" | "warning" | "info";
}

export async function runLaunchChecklist(): Promise<ChecklistItem[]> {
  const checks: ChecklistItem[] = [];

  // ── Infrastructure ──────────────────────────────────────────────────────

  // Database connectivity
  let dbConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch {
    // remains false
  }
  checks.push({
    id: "db_connected",
    category: "Infrastructure",
    label: "Database connected",
    description: "PostgreSQL is reachable and responding to queries",
    passed: dbConnected,
    severity: "critical",
  });

  // Stripe API key
  checks.push({
    id: "stripe_key",
    category: "Payments",
    label: "Stripe secret key configured",
    description: "STRIPE_SECRET_KEY is set for processing payments",
    passed: !!process.env.STRIPE_SECRET_KEY,
    severity: "critical",
  });

  checks.push({
    id: "stripe_publishable",
    category: "Payments",
    label: "Stripe publishable key configured",
    description: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY for client-side Stripe Elements",
    passed: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    severity: "critical",
  });

  checks.push({
    id: "stripe_webhook",
    category: "Payments",
    label: "Stripe webhook secret configured",
    description: "STRIPE_WEBHOOK_SECRET for validating incoming webhook events",
    passed: !!process.env.STRIPE_WEBHOOK_SECRET,
    severity: "critical",
  });

  checks.push({
    id: "stripe_connect_webhook",
    category: "Payments",
    label: "Stripe Connect webhook secret configured",
    description: "STRIPE_CONNECT_WEBHOOK_SECRET for Connect account events",
    passed: !!process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    severity: "warning",
  });

  // Auth
  checks.push({
    id: "nextauth_secret",
    category: "Auth",
    label: "NextAuth secret configured",
    description: "NEXTAUTH_SECRET is set for session encryption",
    passed: !!process.env.NEXTAUTH_SECRET,
    severity: "critical",
  });

  checks.push({
    id: "nextauth_url",
    category: "Auth",
    label: "NextAuth URL configured",
    description: "NEXTAUTH_URL is set for callback URLs",
    passed: !!process.env.NEXTAUTH_URL,
    severity: "warning",
  });

  checks.push({
    id: "google_oauth",
    category: "Auth",
    label: "Google OAuth configured",
    description: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set",
    passed: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
    severity: "warning",
  });

  // ── Services ──────────────────────────────────────────────────────────

  checks.push({
    id: "mapbox",
    category: "Services",
    label: "Mapbox configured",
    description: "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN for address autocomplete and maps",
    passed: !!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
    severity: "warning",
  });

  checks.push({
    id: "telnyx",
    category: "Services",
    label: "Telnyx SMS configured",
    description: "TELNYX_API_KEY for sending SMS notifications",
    passed: !!process.env.TELNYX_API_KEY,
    severity: "warning",
  });

  checks.push({
    id: "ses",
    category: "Services",
    label: "Amazon SES configured",
    description: "AWS SES credentials for sending email notifications",
    passed: !!process.env.AWS_SES_ACCESS_KEY_ID,
    severity: "warning",
  });

  checks.push({
    id: "r2",
    category: "Services",
    label: "Cloudflare R2 configured",
    description: "R2 credentials for file uploads (photos, documents)",
    passed: !!process.env.R2_ACCESS_KEY_ID,
    severity: "warning",
  });

  checks.push({
    id: "firebase",
    category: "Services",
    label: "Firebase push notifications configured",
    description: "Firebase credentials for push notifications",
    passed: !!process.env.FIREBASE_PROJECT_ID,
    severity: "info",
  });

  // ── Monitoring ──────────────────────────────────────────────────────────

  checks.push({
    id: "sentry",
    category: "Monitoring",
    label: "Sentry error monitoring configured",
    description: "NEXT_PUBLIC_SENTRY_DSN for tracking production errors",
    passed: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    severity: "warning",
  });

  checks.push({
    id: "cron_secret",
    category: "Monitoring",
    label: "Cron secret configured",
    description: "CRON_SECRET for authenticating scheduled cron job requests",
    passed: !!process.env.CRON_SECRET,
    severity: "warning",
  });

  // ── Data ──────────────────────────────────────────────────────────────

  let tenantCount = 0;
  let adminCount = 0;
  try {
    tenantCount = await prisma.tenant.count({ where: { isActive: true } });
    adminCount = await prisma.user.count({ where: { role: "platform_admin" } });
  } catch {
    // DB might be down
  }

  checks.push({
    id: "has_tenant",
    category: "Data",
    label: "At least 1 active tenant exists",
    description: "The platform needs at least one tenant to be operational",
    passed: tenantCount > 0,
    severity: "critical",
  });

  checks.push({
    id: "has_admin",
    category: "Data",
    label: "Platform admin user exists",
    description: "At least one user with platform_admin role for managing the platform",
    passed: adminCount > 0,
    severity: "critical",
  });

  // ── App Config ──────────────────────────────────────────────────────────

  checks.push({
    id: "app_url",
    category: "Config",
    label: "App URL configured",
    description: "NEXT_PUBLIC_APP_URL is set (used for links, OG tags, etc.)",
    passed: !!process.env.NEXT_PUBLIC_APP_URL,
    severity: "critical",
  });

  checks.push({
    id: "platform_domain",
    category: "Config",
    label: "Platform domain configured",
    description: "NEXT_PUBLIC_PLATFORM_DOMAIN for subdomain routing",
    passed: !!process.env.NEXT_PUBLIC_PLATFORM_DOMAIN,
    severity: "critical",
  });

  checks.push({
    id: "production_mode",
    category: "Config",
    label: "Running in production mode",
    description: "NODE_ENV is set to production",
    passed: process.env.NODE_ENV === "production",
    severity: "info",
  });

  return checks;
}
