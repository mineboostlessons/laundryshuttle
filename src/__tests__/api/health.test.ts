import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma before importing route
vi.mock("@/lib/prisma", () => ({
  default: {
    $queryRaw: vi.fn(),
  },
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return 200 when database is healthy", async () => {
    const prisma = (await import("@/lib/prisma")).default;
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    // Status is 200 when no unhealthy services (degraded is ok — just means optional services unconfigured)
    expect(response.status).toBe(200);
    expect(["healthy", "degraded"]).toContain(body.status);
    expect(body.checks).toBeInstanceOf(Array);
    expect(body.timestamp).toBeDefined();
    expect(body.version).toBeDefined();

    const dbCheck = body.checks.find((c: { name: string }) => c.name === "database");
    expect(dbCheck.status).toBe("healthy");
  });

  it("should return 503 when database is unhealthy", async () => {
    const prisma = (await import("@/lib/prisma")).default;
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("Connection refused"));

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("unhealthy");

    const dbCheck = body.checks.find((c: { name: string }) => c.name === "database");
    expect(dbCheck.status).toBe("unhealthy");
  });

  it("should include service configuration checks", async () => {
    const prisma = (await import("@/lib/prisma")).default;
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    const serviceNames = body.checks.map((c: { name: string }) => c.name);
    expect(serviceNames).toContain("database");
    expect(serviceNames).toContain("stripe");
    expect(serviceNames).toContain("email_ses");
    expect(serviceNames).toContain("sms_telnyx");
    expect(serviceNames).toContain("push_firebase");
    expect(serviceNames).toContain("storage_r2");
  });

  it("should have Cache-Control: no-store header", async () => {
    const prisma = (await import("@/lib/prisma")).default;
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();

    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
