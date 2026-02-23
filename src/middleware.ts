import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Lightweight auth wrapper — edge-compatible (no Prisma, no bcrypt)
const { auth } = NextAuth(authConfig);

// Routes that require authentication
const PROTECTED_PATTERNS = [
  "/dashboard",
  "/manager",
  "/attendant",
  "/driver",
  "/customer",
  "/pos",
  "/settings",
  "/admin",
];

// Public routes that don't need auth
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/onboarding"];

// Role-to-route access mapping
const ROLE_ROUTE_MAP: Record<string, string[]> = {
  platform_admin: ["/admin"],
  owner: ["/dashboard", "/manager", "/attendant", "/pos", "/settings"],
  manager: ["/manager", "/attendant", "/pos"],
  attendant: ["/attendant", "/pos"],
  driver: ["/driver"],
  customer: ["/customer", "/order"],
};

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PATTERNS.some((pattern) => pathname.includes(pattern));
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function hasRouteAccess(role: string, pathname: string): boolean {
  const allowedPaths = ROLE_ROUTE_MAP[role];
  if (!allowedPaths) return false;
  return allowedPaths.some((path) => pathname.includes(path));
}

function getDefaultRedirect(role: string): string {
  switch (role) {
    case "platform_admin":
      return "/admin";
    case "owner":
      return "/dashboard";
    case "manager":
      return "/manager";
    case "attendant":
      return "/attendant";
    case "driver":
      return "/driver";
    case "customer":
      return "/customer";
    default:
      return "/";
  }
}

// In-memory rate limiting (lightweight, no external deps)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count++;
  return entry.count <= limit;
}

export default auth((request) => {
  const url = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "laundryshuttle.com";
  const pathname = url.pathname;

  // Skip middleware for static files, assets
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/offline") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/monitoring") ||
    (pathname.includes(".") && !pathname.startsWith("/api/"))
  ) {
    return NextResponse.next();
  }

  // Rate limit auth and API endpoints
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (pathname.startsWith("/api/auth")) {
    if (!checkRateLimit(`auth:${ip}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  } else if (pathname.startsWith("/api/") && !pathname.startsWith("/api/webhooks") && !pathname.startsWith("/api/health")) {
    if (!checkRateLimit(`api:${ip}`, 60, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  // Skip further middleware for API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // --- Tenant resolution ---
  const headers = new Headers(request.headers);
  const vercelUrl = process.env.VERCEL_URL || "";

  if (hostname.includes("localhost") || hostname === vercelUrl || hostname.endsWith(".vercel.app")) {
    const tenantSlug = url.searchParams.get("tenant") || "demo";
    headers.set("x-tenant-slug", tenantSlug);
  } else if (hostname === `admin.${platformDomain}` || hostname === platformDomain) {
    headers.set("x-tenant-slug", "__platform__");
  } else if (hostname.endsWith(`.${platformDomain}`)) {
    const tenantSlug = hostname.replace(`.${platformDomain}`, "");
    if (tenantSlug && tenantSlug !== "www") {
      headers.set("x-tenant-slug", tenantSlug);
    }
  } else {
    // Custom domain — set header for server-side resolution
    headers.set("x-custom-domain", hostname);
  }

  // --- Auth checks ---
  const session = request.auth;

  // Redirect authenticated users away from auth pages
  if (isPublicRoute(pathname) && session?.user) {
    const redirectUrl = getDefaultRedirect(session.user.role);
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Redirect unauthenticated users to login for protected routes
  if (isProtectedRoute(pathname) && !session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access for protected routes
  if (isProtectedRoute(pathname) && session?.user) {
    const role = session.user.role;

    if (!hasRouteAccess(role, pathname)) {
      const redirectUrl = getDefaultRedirect(role);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // Tenant-session mismatch check
    const tenantSlug = headers.get("x-tenant-slug");
    if (
      tenantSlug &&
      tenantSlug !== "__platform__" &&
      session.user.tenantSlug &&
      session.user.tenantSlug !== tenantSlug &&
      role !== "platform_admin"
    ) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "tenant_mismatch");
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next({ request: { headers } });
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
