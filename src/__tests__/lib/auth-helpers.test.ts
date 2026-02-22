import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth before importing auth-helpers
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
  default: vi.fn(),
}));

// Need to dynamically import after mocks are set up
const { requireAuth, requireRole, getSession } = await import(
  "@/lib/auth-helpers"
);

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session when user is authenticated", async () => {
    const mockSession = {
      user: {
        id: "user_1",
        email: "admin@test.com",
        role: "platform_admin",
        tenantId: null,
        tenantSlug: null,
      },
    };
    mockAuth.mockResolvedValue(mockSession);

    const result = await requireAuth();
    expect(result).toEqual(mockSession);
  });

  it("redirects to /login when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requireAuth()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects when session has no user", async () => {
    mockAuth.mockResolvedValue({ user: null });

    await expect(requireAuth()).rejects.toThrow("REDIRECT:/login");
  });
});

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session when user has correct role", async () => {
    const mockSession = {
      user: {
        id: "user_1",
        email: "owner@test.com",
        role: "owner",
        tenantId: "tenant_1",
        tenantSlug: "demo",
      },
    };
    mockAuth.mockResolvedValue(mockSession);

    const result = await requireRole("owner" as never);
    expect(result).toEqual(mockSession);
  });

  it("accepts multiple roles", async () => {
    const mockSession = {
      user: {
        id: "user_1",
        email: "manager@test.com",
        role: "manager",
        tenantId: "tenant_1",
        tenantSlug: "demo",
      },
    };
    mockAuth.mockResolvedValue(mockSession);

    const result = await requireRole("owner" as never, "manager" as never);
    expect(result).toEqual(mockSession);
  });

  it("redirects when user has wrong role", async () => {
    const mockSession = {
      user: {
        id: "user_1",
        email: "customer@test.com",
        role: "customer",
        tenantId: "tenant_1",
        tenantSlug: "demo",
      },
    };
    mockAuth.mockResolvedValue(mockSession);

    await expect(requireRole("owner" as never)).rejects.toThrow("REDIRECT:/");
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session without redirecting", async () => {
    const mockSession = {
      user: { id: "user_1", email: "test@test.com", role: "customer" },
    };
    mockAuth.mockResolvedValue(mockSession);

    const result = await getSession();
    expect(result).toEqual(mockSession);
  });

  it("returns null without redirecting when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getSession();
    expect(result).toBeNull();
  });
});
