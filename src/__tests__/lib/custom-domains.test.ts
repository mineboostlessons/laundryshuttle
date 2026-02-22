import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import {
  validateDomainFormat,
  initiateCustomDomain,
  removeCustomDomain,
  getCustomDomainStatus,
} from "@/lib/custom-domains";

const mockPrisma = vi.mocked(prisma);

describe("validateDomainFormat", () => {
  it("accepts valid domain names", () => {
    expect(validateDomainFormat("example.com")).toEqual({ valid: true });
    expect(validateDomainFormat("www.example.com")).toEqual({ valid: true });
    expect(validateDomainFormat("app.my-laundry.com")).toEqual({ valid: true });
    expect(validateDomainFormat("subdomain.example.co.uk")).toEqual({ valid: true });
  });

  it("rejects empty strings", () => {
    const result = validateDomainFormat("");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("required");
  });

  it("rejects platform subdomains", () => {
    const result = validateDomainFormat("demo.laundryshuttle.com");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("platform subdomain");
  });

  it("rejects the platform domain itself", () => {
    const result = validateDomainFormat("laundryshuttle.com");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("platform subdomain");
  });

  it("rejects IP addresses", () => {
    const result = validateDomainFormat("192.168.1.1");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("IP addresses");
  });

  it("rejects localhost", () => {
    const result = validateDomainFormat("localhost");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("localhost");
  });

  it("rejects invalid domain formats", () => {
    expect(validateDomainFormat("no-tld").valid).toBe(false);
    expect(validateDomainFormat("-invalid.com").valid).toBe(false);
    expect(validateDomainFormat("spaces here.com").valid).toBe(false);
    expect(validateDomainFormat("under_score.com").valid).toBe(false);
  });

  it("normalizes to lowercase", () => {
    const result = validateDomainFormat("MyDomain.COM");
    expect(result.valid).toBe(true);
  });

  it("rejects domains longer than 253 characters", () => {
    // Build a domain > 253 chars: 63.63.63.63.com = 258 chars
    const longDomain = `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.com`;
    const result = validateDomainFormat(longDomain);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too long");
  });
});

describe("initiateCustomDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid domain format", async () => {
    const result = await initiateCustomDomain("tenant_1", "not-a-domain");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rejects domain already taken by another tenant", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: "other_tenant",
    } as never);

    const result = await initiateCustomDomain("tenant_1", "taken.com");
    expect(result.success).toBe(false);
    expect(result.error).toContain("already in use");
  });

  it("allows same tenant to re-initiate their own domain", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: "tenant_1",
    } as never);
    mockPrisma.customDomainVerification.findUnique.mockResolvedValue(null as never);
    mockPrisma.customDomainVerification.upsert.mockResolvedValue({
      domain: "mylaundry.com",
      verificationToken: "laundryshuttle-verify=abc123",
      cnameTarget: "domains.laundryshuttle.com",
      txtRecordName: "_laundryshuttle-verify.mylaundry.com",
      status: "pending",
      verifiedAt: null,
      lastCheckedAt: null,
      failureReason: null,
    } as never);

    const result = await initiateCustomDomain("tenant_1", "mylaundry.com");
    expect(result.success).toBe(true);
    expect(result.data?.domain).toBe("mylaundry.com");
    expect(result.data?.cnameTarget).toBe("domains.laundryshuttle.com");
  });

  it("rejects domain being configured by another tenant", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null as never);
    mockPrisma.customDomainVerification.findUnique.mockResolvedValue({
      tenantId: "other_tenant",
      domain: "claimed.com",
    } as never);

    const result = await initiateCustomDomain("tenant_1", "claimed.com");
    expect(result.success).toBe(false);
    expect(result.error).toContain("already being configured");
  });
});

describe("removeCustomDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects removal by non-owner tenant", async () => {
    mockPrisma.customDomainVerification.findUnique.mockResolvedValue({
      tenantId: "other_tenant",
      domain: "example.com",
    } as never);

    const result = await removeCustomDomain("tenant_1", "example.com");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });
});

describe("getCustomDomainStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null domain and verification when none configured", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      customDomain: null,
    } as never);
    mockPrisma.customDomainVerification.findFirst.mockResolvedValue(null as never);

    const result = await getCustomDomainStatus("tenant_1");
    expect(result.currentDomain).toBeNull();
    expect(result.verification).toBeNull();
  });

  it("returns current domain and verification info", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      customDomain: "mylaundry.com",
    } as never);
    mockPrisma.customDomainVerification.findFirst.mockResolvedValue({
      domain: "mylaundry.com",
      verificationToken: "token123",
      cnameTarget: "domains.laundryshuttle.com",
      txtRecordName: "_laundryshuttle-verify.mylaundry.com",
      status: "verified",
      verifiedAt: new Date("2025-01-15"),
      lastCheckedAt: new Date("2025-01-15"),
      failureReason: null,
    } as never);

    const result = await getCustomDomainStatus("tenant_1");
    expect(result.currentDomain).toBe("mylaundry.com");
    expect(result.verification?.status).toBe("verified");
    expect(result.verification?.domain).toBe("mylaundry.com");
  });
});
