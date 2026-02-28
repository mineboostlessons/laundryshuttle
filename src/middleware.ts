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
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/onboarding", "/staff/login", "/terms", "/privacy"];

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
  const platformDomain = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "laundryshuttle.com").trim();
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

  // Skip further middleware for API routes (but still resolve tenant for API calls)
  if (pathname.startsWith("/api/")) {
    const apiHeaders = new Headers(request.headers);
    const vercelUrlApi = process.env.VERCEL_URL || "";
    if (hostname.includes("localhost") || hostname === vercelUrlApi || hostname.endsWith(".vercel.app")) {
      const tenantSlug = url.searchParams.get("tenant");
      const cookieTenant = request.cookies.get("__tenant_slug")?.value;
      apiHeaders.set("x-tenant-slug", tenantSlug || cookieTenant || "__platform__");
    } else if (hostname === `admin.${platformDomain}` || hostname === platformDomain) {
      apiHeaders.set("x-tenant-slug", "__platform__");
    } else if (hostname.endsWith(`.${platformDomain}`)) {
      const tenantSlug = hostname.replace(`.${platformDomain}`, "");
      if (tenantSlug && tenantSlug !== "www") {
        apiHeaders.set("x-tenant-slug", tenantSlug);
      }
    } else {
      // Custom domain — set header for server-side resolution
      apiHeaders.set("x-custom-domain", hostname);
    }
    return NextResponse.next({ request: { headers: apiHeaders } });
  }

  // --- Tenant resolution ---
  const headers = new Headers(request.headers);
  const vercelUrl = process.env.VERCEL_URL || "";
  let tenantFromParam = false;
  let resolvedTenantSlug = "__platform__";

  if (hostname.includes("localhost") || hostname === vercelUrl || hostname.endsWith(".vercel.app")) {
    const tenantSlug = url.searchParams.get("tenant");
    if (tenantSlug) {
      // Explicit tenant param — use it and persist via cookie
      resolvedTenantSlug = tenantSlug;
      tenantFromParam = true;
    } else if (pathname !== "/" && !isPublicRoute(pathname)) {
      // Fall back to cookie-persisted tenant (only for non-root, non-auth paths)
      // Root "/" without ?tenant= always shows the platform marketing page
      // Auth pages (/login, /register, etc.) without ?tenant= default to platform
      const cookieTenant = request.cookies.get("__tenant_slug")?.value;
      resolvedTenantSlug = cookieTenant || "__platform__";
    }
    headers.set("x-tenant-slug", resolvedTenantSlug);
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

  // Redirect authenticated users away from auth pages (but not onboarding — admins need it)
  if (isPublicRoute(pathname) && !pathname.startsWith("/onboarding") && session?.user) {
    const tenantSlug = headers.get("x-tenant-slug");
    // On platform domain, only redirect platform admins (tenant users have no dashboard here)
    if (tenantSlug === "__platform__" && session.user.role !== "platform_admin") {
      // Let them through — they can see the login/marketing page
    } else {
      const redirectUrl = getDefaultRedirect(session.user.role);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
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
    const tenantSlug = headers.get("x-tenant-slug");

    // Block non-admin users from accessing tenant routes on platform domain
    if (tenantSlug === "__platform__" && role !== "platform_admin" && !pathname.includes("/admin")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (!hasRouteAccess(role, pathname)) {
      const redirectUrl = getDefaultRedirect(role);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // Tenant-session mismatch check
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

  const response = NextResponse.next({ request: { headers } });

  // Persist tenant slug in cookie when resolved from ?tenant= param
  if (tenantFromParam) {
    response.cookies.set("__tenant_slug", resolvedTenantSlug, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
