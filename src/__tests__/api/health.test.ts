import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma before importing route
vi.mock("@/lib/prisma", () => ({
  default: {
    $queryRaw: vi.fn(),
  },
}));

function makeRequest(headers?: Record<string, string>) {
  return new NextRequest("http://localhost:3000/api/health", {
    headers: headers ?? {},
  });
}

describe("GET /api/health", () => {
  const HEALTH_SECRET = "test-health-secret";

  beforeEach(() => {
    vi.resetModules();
    process.env.HEALTH_CHECK_SECRET = HEALTH_SECRET;
  });

  afterEach(() => {
    delete process.env.HEALTH_CHECK_SECRET;
  });

  it("should return minimal response without auth", async () => {
    const prisma = (await import("@/lib/prisma")).default;
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.timestamp).toBeDefined();
    // Should NOT include detailed checks or infrastructure info
    expect(body.checks).toBeUndefined();
    expect(body.version).toBeUndefined();
  });

  it("should return 200 with detailed checks when authenticated", async () => {
    const prisma = (await import("@/lib/prisma")).default;
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET(
      makeRequest({ authorization: `Bearer ${HEALTH_SECRET}` })
    );
    const body = await response.json();

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
    const response = await GET(
      makeRequest({ authorization: `Bearer ${HEALTH_SECRET}` })
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("unhealthy");

    const dbCheck = body.checks.find((c: { name: string }) => c.name === "database");
    expect(dbCheck.status).toBe("unhealthy");
  });

  it("should include service configuration checks when authenticated", async () => {
    const prisma = (await import("@/lib/prisma")).default;
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET(
      makeRequest({ authorization: `Bearer ${HEALTH_SECRET}` })
    );
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
    const response = await GET(makeRequest());

    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
