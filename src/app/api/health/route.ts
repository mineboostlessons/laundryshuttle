import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ServiceCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs?: number;
  message?: string;
}

export async function GET() {
  const startTime = Date.now();
  const checks: ServiceCheck[] = [];

  // Database check
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.push({
      name: "database",
      status: "healthy",
      latencyMs: Date.now() - dbStart,
    });
  } catch (error) {
    checks.push({
      name: "database",
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Connection failed",
    });
  }

  // Stripe API key check (non-blocking, just checks if configured)
  checks.push({
    name: "stripe",
    status: process.env.STRIPE_SECRET_KEY ? "healthy" : "degraded",
    message: process.env.STRIPE_SECRET_KEY ? "API key configured" : "API key not configured",
  });

  // Email (SES)
  checks.push({
    name: "email_ses",
    status: process.env.AWS_SES_ACCESS_KEY_ID ? "healthy" : "degraded",
    message: process.env.AWS_SES_ACCESS_KEY_ID ? "Configured" : "Not configured",
  });

  // SMS (Telnyx)
  checks.push({
    name: "sms_telnyx",
    status: process.env.TELNYX_API_KEY ? "healthy" : "degraded",
    message: process.env.TELNYX_API_KEY ? "Configured" : "Not configured",
  });

  // Push (Firebase)
  checks.push({
    name: "push_firebase",
    status: process.env.FIREBASE_PROJECT_ID ? "healthy" : "degraded",
    message: process.env.FIREBASE_PROJECT_ID ? "Configured" : "Not configured",
  });

  // Storage (R2)
  checks.push({
    name: "storage_r2",
    status: process.env.R2_ACCESS_KEY_ID ? "healthy" : "degraded",
    message: process.env.R2_ACCESS_KEY_ID ? "Configured" : "Not configured",
  });

  // Sentry
  checks.push({
    name: "error_monitoring",
    status: process.env.NEXT_PUBLIC_SENTRY_DSN ? "healthy" : "degraded",
    message: process.env.NEXT_PUBLIC_SENTRY_DSN ? "Configured" : "Not configured",
  });

  // Overall status
  const hasUnhealthy = checks.some((c) => c.status === "unhealthy");
  const hasDegraded = checks.some((c) => c.status === "degraded");
  const overallStatus = hasUnhealthy ? "unhealthy" : hasDegraded ? "degraded" : "healthy";

  const response = {
    status: overallStatus,
    version: process.env.npm_package_version || "0.1.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    responseTimeMs: Date.now() - startTime,
    checks,
  };

  return NextResponse.json(response, {
    status: hasUnhealthy ? 503 : 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
