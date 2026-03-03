import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyBearerSecret } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ServiceCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs?: number;
  message?: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Only return detailed checks if the request includes a valid health check token
  const authHeader = request.headers.get("authorization");
  const healthSecret = process.env.HEALTH_CHECK_SECRET;
  const isAuthenticated = verifyBearerSecret(authHeader, healthSecret);

  // Database check (always performed — needed for basic status)
  let dbHealthy = false;
  let dbLatency = 0;
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbHealthy = true;
    dbLatency = Date.now() - dbStart;
  } catch {
    dbHealthy = false;
  }

  // Unauthenticated: return minimal response (no infrastructure details)
  if (!isAuthenticated) {
    return NextResponse.json(
      {
        status: dbHealthy ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
      },
      {
        status: dbHealthy ? 200 : 503,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }

  // Authenticated: return detailed checks
  const checks: ServiceCheck[] = [];

  checks.push({
    name: "database",
    status: dbHealthy ? "healthy" : "unhealthy",
    latencyMs: dbLatency,
    ...(!dbHealthy ? { message: "Connection failed" } : {}),
  });

  checks.push({
    name: "stripe",
    status: process.env.STRIPE_SECRET_KEY ? "healthy" : "degraded",
    message: process.env.STRIPE_SECRET_KEY ? "API key configured" : "API key not configured",
  });

  checks.push({
    name: "email_ses",
    status: process.env.AWS_SES_ACCESS_KEY_ID ? "healthy" : "degraded",
    message: process.env.AWS_SES_ACCESS_KEY_ID ? "Configured" : "Not configured",
  });

  checks.push({
    name: "sms_telnyx",
    status: process.env.TELNYX_API_KEY ? "healthy" : "degraded",
    message: process.env.TELNYX_API_KEY ? "Configured" : "Not configured",
  });

  checks.push({
    name: "push_firebase",
    status: process.env.FIREBASE_PROJECT_ID ? "healthy" : "degraded",
    message: process.env.FIREBASE_PROJECT_ID ? "Configured" : "Not configured",
  });

  checks.push({
    name: "storage_r2",
    status: process.env.R2_ACCESS_KEY_ID ? "healthy" : "degraded",
    message: process.env.R2_ACCESS_KEY_ID ? "Configured" : "Not configured",
  });

  checks.push({
    name: "error_monitoring",
    status: process.env.NEXT_PUBLIC_SENTRY_DSN ? "healthy" : "degraded",
    message: process.env.NEXT_PUBLIC_SENTRY_DSN ? "Configured" : "Not configured",
  });

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
