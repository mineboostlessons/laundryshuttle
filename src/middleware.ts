import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit, rateLimitHeaders, AUTH_RATE_LIMIT, API_RATE_LIMIT } from "@/lib/rate-limit";

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

// Paths to skip entirely (static assets, service worker, etc.)
const SKIP_PATHS = ["/api/", "/_next/", "/favicon.ico", "/sw.js", "/manifest", "/offline", "/icons/"];

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

  // Rate limit auth endpoints
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (pathname.startsWith("/api/auth")) {
    const result = rateLimit(`auth:${ip}`, AUTH_RATE_LIMIT);
    if (!result.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: rateLimitHeaders(result) }
      );
    }
  } else if (pathname.startsWith("/api/") && !pathname.startsWith("/api/webhooks") && !pathname.startsWith("/api/health")) {
    const result = rateLimit(`api:${ip}`, API_RATE_LIMIT);
    if (!result.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: rateLimitHeaders(result) }
      );
    }
  }

  // Skip further middleware for API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // --- Tenant resolution ---
  const headers = new Headers(request.headers);

  if (hostname.includes("localhost")) {
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

    // Prevent non-platform-admins from accessing /admin routes
    // Prevent platform-admins from accessing tenant routes
    if (!hasRouteAccess(role, pathname)) {
      const redirectUrl = getDefaultRedirect(role);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // Tenant-session mismatch check: if user is a tenant user
    // accessing a different tenant's subdomain, redirect to login
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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
