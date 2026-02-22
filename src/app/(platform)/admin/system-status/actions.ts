"use server";

import prisma from "@/lib/prisma";
import { checkEnvironmentVariables } from "@/lib/env";

export interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs?: number;
  message?: string;
}

export interface SystemStatusData {
  services: ServiceHealth[];
  envChecks: { name: string; category: string; configured: boolean; required: boolean }[];
  database: {
    connected: boolean;
    latencyMs: number;
    tenantCount: number;
    userCount: number;
    orderCount: number;
  };
  crons: {
    name: string;
    path: string;
    schedule: string;
    description: string;
  }[];
  appInfo: {
    version: string;
    nodeEnv: string;
    uptime: number;
  };
}

export async function getSystemStatus(): Promise<SystemStatusData> {
  // Database connectivity and stats
  let dbConnected = false;
  let dbLatency = 0;
  let tenantCount = 0;
  let userCount = 0;
  let orderCount = 0;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - start;
    dbConnected = true;

    [tenantCount, userCount, orderCount] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.order.count(),
    ]);
  } catch {
    dbConnected = false;
  }

  // Service health checks
  const services: ServiceHealth[] = [
    {
      name: "PostgreSQL (Neon)",
      status: dbConnected ? "healthy" : "unhealthy",
      latencyMs: dbLatency,
      message: dbConnected ? `Connected (${dbLatency}ms)` : "Connection failed",
    },
    {
      name: "Stripe Payments",
      status: process.env.STRIPE_SECRET_KEY ? "healthy" : "unhealthy",
      message: process.env.STRIPE_SECRET_KEY
        ? `Key: ${process.env.STRIPE_SECRET_KEY.substring(0, 7)}...`
        : "API key not configured",
    },
    {
      name: "Stripe Webhooks",
      status: process.env.STRIPE_WEBHOOK_SECRET ? "healthy" : "degraded",
      message: process.env.STRIPE_WEBHOOK_SECRET ? "Secret configured" : "Webhook secret missing",
    },
    {
      name: "Mapbox (Maps)",
      status: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? "healthy" : "degraded",
      message: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? "Token configured" : "Not configured",
    },
    {
      name: "Telnyx (SMS)",
      status: process.env.TELNYX_API_KEY ? "healthy" : "degraded",
      message: process.env.TELNYX_API_KEY ? "API key configured" : "Not configured",
    },
    {
      name: "Amazon SES (Email)",
      status: process.env.AWS_SES_ACCESS_KEY_ID ? "healthy" : "degraded",
      message: process.env.AWS_SES_ACCESS_KEY_ID ? "Credentials configured" : "Not configured",
    },
    {
      name: "Cloudflare R2 (Storage)",
      status: process.env.R2_ACCESS_KEY_ID ? "healthy" : "degraded",
      message: process.env.R2_ACCESS_KEY_ID ? "Credentials configured" : "Not configured",
    },
    {
      name: "Firebase (Push)",
      status: process.env.FIREBASE_PROJECT_ID ? "healthy" : "degraded",
      message: process.env.FIREBASE_PROJECT_ID ? `Project: ${process.env.FIREBASE_PROJECT_ID}` : "Not configured",
    },
    {
      name: "Sentry (Monitoring)",
      status: process.env.NEXT_PUBLIC_SENTRY_DSN ? "healthy" : "degraded",
      message: process.env.NEXT_PUBLIC_SENTRY_DSN ? "DSN configured" : "Not configured",
    },
  ];

  // Cron jobs
  const crons = [
    { name: "Mark Overdue Invoices", path: "/api/cron/invoices", schedule: "0 9 * * *", description: "Daily at 9 AM UTC" },
    { name: "Retry Failed Webhooks", path: "/api/cron/webhooks", schedule: "*/15 * * * *", description: "Every 15 minutes" },
    { name: "Win-Back Campaigns", path: "/api/cron/winback", schedule: "0 10 * * *", description: "Daily at 10 AM UTC" },
    { name: "Verify Custom Domains", path: "/api/cron/domains", schedule: "0 */6 * * *", description: "Every 6 hours" },
    { name: "Reset Demo Tenants", path: "/api/cron/demo-reset", schedule: "0 */4 * * *", description: "Every 4 hours" },
    { name: "Generate Benchmarks", path: "/api/cron/benchmarks", schedule: "0 2 * * *", description: "Daily at 2 AM UTC" },
  ];

  return {
    services,
    envChecks: checkEnvironmentVariables(),
    database: {
      connected: dbConnected,
      latencyMs: dbLatency,
      tenantCount,
      userCount,
      orderCount,
    },
    crons,
    appInfo: {
      version: "0.1.0",
      nodeEnv: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
    },
  };
}
