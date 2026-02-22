import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the middleware logic by extracting and testing its sub-functions.
// The actual middleware wraps NextAuth's auth(), so we test the helper functions
// and tenant resolution logic independently.

// ---- Inline copies of middleware helper functions for testing ----
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

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/onboarding"];

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

function resolveTenant(
  hostname: string,
  searchParams: URLSearchParams,
  platformDomain: string
): { tenantSlug?: string; customDomain?: string } {
  if (hostname.includes("localhost")) {
    return { tenantSlug: searchParams.get("tenant") || "demo" };
  } else if (
    hostname === `admin.${platformDomain}` ||
    hostname === platformDomain
  ) {
    return { tenantSlug: "__platform__" };
  } else if (hostname.endsWith(`.${platformDomain}`)) {
    const slug = hostname.replace(`.${platformDomain}`, "");
    if (slug && slug !== "www") {
      return { tenantSlug: slug };
    }
    return {};
  } else {
    return { customDomain: hostname };
  }
}

function getDefaultRedirect(role: string): string {
  if (role === "platform_admin") return "/admin";
  switch (role) {
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

// ---- Tests ----

describe("isProtectedRoute", () => {
  it("returns true for dashboard routes", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/dashboard/orders")).toBe(true);
  });

  it("returns true for role-specific routes", () => {
    expect(isProtectedRoute("/manager")).toBe(true);
    expect(isProtectedRoute("/attendant")).toBe(true);
    expect(isProtectedRoute("/driver")).toBe(true);
    expect(isProtectedRoute("/customer")).toBe(true);
    expect(isProtectedRoute("/pos")).toBe(true);
    expect(isProtectedRoute("/admin")).toBe(true);
  });

  it("returns true for nested protected routes", () => {
    expect(isProtectedRoute("/settings/payments")).toBe(true);
    expect(isProtectedRoute("/admin/tenants/abc")).toBe(true);
  });

  it("returns false for public routes", () => {
    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/login")).toBe(false);
    expect(isProtectedRoute("/register")).toBe(false);
    expect(isProtectedRoute("/order")).toBe(false);
  });
});

describe("isPublicRoute", () => {
  it("returns true for auth pages", () => {
    expect(isPublicRoute("/login")).toBe(true);
    expect(isPublicRoute("/register")).toBe(true);
    expect(isPublicRoute("/forgot-password")).toBe(true);
    expect(isPublicRoute("/onboarding")).toBe(true);
  });

  it("returns false for protected pages", () => {
    expect(isPublicRoute("/dashboard")).toBe(false);
    expect(isPublicRoute("/admin")).toBe(false);
  });
});

describe("hasRouteAccess", () => {
  it("platform_admin can only access /admin", () => {
    expect(hasRouteAccess("platform_admin", "/admin")).toBe(true);
    expect(hasRouteAccess("platform_admin", "/admin/tenants")).toBe(true);
    expect(hasRouteAccess("platform_admin", "/dashboard")).toBe(false);
  });

  it("owner can access dashboard, manager, attendant, pos, settings", () => {
    expect(hasRouteAccess("owner", "/dashboard")).toBe(true);
    expect(hasRouteAccess("owner", "/dashboard/orders")).toBe(true);
    expect(hasRouteAccess("owner", "/manager")).toBe(true);
    expect(hasRouteAccess("owner", "/attendant")).toBe(true);
    expect(hasRouteAccess("owner", "/pos")).toBe(true);
    expect(hasRouteAccess("owner", "/settings")).toBe(true);
    expect(hasRouteAccess("owner", "/admin")).toBe(false);
    expect(hasRouteAccess("owner", "/driver")).toBe(false);
  });

  it("manager can access manager, attendant, pos", () => {
    expect(hasRouteAccess("manager", "/manager")).toBe(true);
    expect(hasRouteAccess("manager", "/attendant")).toBe(true);
    expect(hasRouteAccess("manager", "/pos")).toBe(true);
    expect(hasRouteAccess("manager", "/dashboard")).toBe(false);
  });

  it("attendant can access attendant and pos", () => {
    expect(hasRouteAccess("attendant", "/attendant")).toBe(true);
    expect(hasRouteAccess("attendant", "/pos")).toBe(true);
    expect(hasRouteAccess("attendant", "/manager")).toBe(false);
  });

  it("driver can only access /driver", () => {
    expect(hasRouteAccess("driver", "/driver")).toBe(true);
    expect(hasRouteAccess("driver", "/driver/routes")).toBe(true);
    expect(hasRouteAccess("driver", "/dashboard")).toBe(false);
  });

  it("customer can access /customer and /order", () => {
    expect(hasRouteAccess("customer", "/customer")).toBe(true);
    expect(hasRouteAccess("customer", "/order")).toBe(true);
    expect(hasRouteAccess("customer", "/dashboard")).toBe(false);
  });

  it("unknown role has no access", () => {
    expect(hasRouteAccess("unknown_role", "/dashboard")).toBe(false);
    expect(hasRouteAccess("unknown_role", "/admin")).toBe(false);
  });
});

describe("resolveTenant", () => {
  const platformDomain = "laundryshuttle.com";

  it("uses ?tenant param on localhost, defaults to demo", () => {
    const result = resolveTenant("localhost:3000", new URLSearchParams(), platformDomain);
    expect(result).toEqual({ tenantSlug: "demo" });
  });

  it("uses ?tenant param on localhost when provided", () => {
    const params = new URLSearchParams("tenant=fastfresh");
    const result = resolveTenant("localhost:3000", params, platformDomain);
    expect(result).toEqual({ tenantSlug: "fastfresh" });
  });

  it("resolves platform admin for admin subdomain", () => {
    const result = resolveTenant("admin.laundryshuttle.com", new URLSearchParams(), platformDomain);
    expect(result).toEqual({ tenantSlug: "__platform__" });
  });

  it("resolves platform admin for bare domain", () => {
    const result = resolveTenant("laundryshuttle.com", new URLSearchParams(), platformDomain);
    expect(result).toEqual({ tenantSlug: "__platform__" });
  });

  it("extracts tenant slug from subdomain", () => {
    const result = resolveTenant("fastfresh.laundryshuttle.com", new URLSearchParams(), platformDomain);
    expect(result).toEqual({ tenantSlug: "fastfresh" });
  });

  it("ignores www subdomain", () => {
    const result = resolveTenant("www.laundryshuttle.com", new URLSearchParams(), platformDomain);
    expect(result).toEqual({});
  });

  it("detects custom domain", () => {
    const result = resolveTenant("fastfreshlaundry.com", new URLSearchParams(), platformDomain);
    expect(result).toEqual({ customDomain: "fastfreshlaundry.com" });
  });

  it("detects custom domain with subdomain", () => {
    const result = resolveTenant("app.mylaundry.com", new URLSearchParams(), platformDomain);
    expect(result).toEqual({ customDomain: "app.mylaundry.com" });
  });
});

describe("getDefaultRedirect", () => {
  it("redirects platform_admin to /admin", () => {
    expect(getDefaultRedirect("platform_admin")).toBe("/admin");
  });

  it("redirects owner to /dashboard", () => {
    expect(getDefaultRedirect("owner")).toBe("/dashboard");
  });

  it("redirects manager to /manager", () => {
    expect(getDefaultRedirect("manager")).toBe("/manager");
  });

  it("redirects attendant to /attendant", () => {
    expect(getDefaultRedirect("attendant")).toBe("/attendant");
  });

  it("redirects driver to /driver", () => {
    expect(getDefaultRedirect("driver")).toBe("/driver");
  });

  it("redirects customer to /customer", () => {
    expect(getDefaultRedirect("customer")).toBe("/customer");
  });

  it("redirects unknown role to /", () => {
    expect(getDefaultRedirect("unknown")).toBe("/");
  });
});
