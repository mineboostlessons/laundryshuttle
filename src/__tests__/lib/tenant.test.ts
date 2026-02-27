import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { getTenantBySlug, getTenantByDomain } from "@/lib/tenant";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

const MOCK_TENANT = {
  id: "tenant_1",
  slug: "demo",
  businessName: "Demo Laundry",
  isActive: true,
  themePreset: "modern",
  themeConfig: { primaryColor: "#3B82F6" },
};

describe("getTenantBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tenant when found and active", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(MOCK_TENANT as never);

    const result = await getTenantBySlug("demo");

    expect(result).toEqual({
      ...MOCK_TENANT,
      themeConfig: { primaryColor: "#3B82F6" },
    });
    expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: "demo" },
      select: {
        id: true,
        slug: true,
        businessName: true,
        isActive: true,
        themePreset: true,
        themeConfig: true,
      },
    });
  });

  it("returns null when tenant not found", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null as never);

    const result = await getTenantBySlug("nonexistent");
    expect(result).toBeNull();
  });

  it("returns null when tenant is inactive", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      ...MOCK_TENANT,
      isActive: false,
    } as never);

    const result = await getTenantBySlug("demo");
    expect(result).toBeNull();
  });

  it("handles null themeConfig", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      ...MOCK_TENANT,
      themeConfig: null,
    } as never);

    const result = await getTenantBySlug("demo");
    expect(result?.themeConfig).toBeNull();
  });
});

describe("getTenantByDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tenant when found by custom domain", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(MOCK_TENANT as never);

    const result = await getTenantByDomain("demolaundry.com");

    expect(result).toEqual({
      ...MOCK_TENANT,
      themeConfig: { primaryColor: "#3B82F6" },
    });
    expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { customDomain: "demolaundry.com" },
      select: expect.any(Object),
    });
  });

  it("returns null when no tenant matches domain", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null as never);

    const result = await getTenantByDomain("unknown.com");
    expect(result).toBeNull();
  });

  it("returns null when tenant with domain is inactive", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      ...MOCK_TENANT,
      isActive: false,
    } as never);

    const result = await getTenantByDomain("demolaundry.com");
    expect(result).toBeNull();
  });
});
