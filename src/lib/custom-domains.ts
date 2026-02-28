import { nanoid } from "nanoid";
import prisma from "./prisma";
import { addDomainToVercel, removeDomainFromVercel } from "./vercel-domains";

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "laundryshuttle.com";
const CNAME_TARGET = `domains.${PLATFORM_DOMAIN}`;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate that a string is a properly formatted domain name.
 * Rejects IP addresses, platform subdomains, and invalid formats.
 */
export function validateDomainFormat(domain: string): {
  valid: boolean;
  error?: string;
} {
  const cleaned = domain.toLowerCase().trim();

  if (!cleaned) {
    return { valid: false, error: "Domain is required" };
  }

  // Reject domains that are part of our platform
  if (cleaned === PLATFORM_DOMAIN || cleaned.endsWith(`.${PLATFORM_DOMAIN}`)) {
    return { valid: false, error: "Cannot use a platform subdomain as a custom domain" };
  }

  // Reject IP addresses
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleaned)) {
    return { valid: false, error: "IP addresses are not allowed" };
  }

  // Reject localhost
  if (cleaned === "localhost" || cleaned.startsWith("localhost:")) {
    return { valid: false, error: "localhost is not a valid custom domain" };
  }

  // Basic domain format: at least two labels separated by dots
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
  if (!domainRegex.test(cleaned)) {
    return { valid: false, error: "Invalid domain format" };
  }

  // Reject overly long domains
  if (cleaned.length > 253) {
    return { valid: false, error: "Domain name is too long" };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// DNS Verification
// ---------------------------------------------------------------------------

interface DnsCheckResult {
  verified: boolean;
  method: "cname" | "txt";
  error?: string;
}

/**
 * Check DNS records for the given domain.
 * Verifies either a CNAME record pointing to our platform
 * or a TXT verification record.
 *
 * Uses DNS over HTTPS (Cloudflare) for serverless compatibility.
 */
export async function verifyDomainDns(
  domain: string,
  verificationToken: string
): Promise<DnsCheckResult> {
  try {
    // Check CNAME record first
    const cnameResult = await checkCnameRecord(domain);
    if (cnameResult) {
      return { verified: true, method: "cname" };
    }

    // Check TXT verification record
    const txtResult = await checkTxtRecord(domain, verificationToken);
    if (txtResult) {
      return { verified: true, method: "txt" };
    }

    return {
      verified: false,
      method: "cname",
      error: "No valid CNAME or TXT record found",
    };
  } catch (error) {
    return {
      verified: false,
      method: "cname",
      error: `DNS lookup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function checkCnameRecord(domain: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CNAME`,
      { headers: { Accept: "application/dns-json" } }
    );

    if (!response.ok) return false;

    const data = await response.json() as {
      Answer?: Array<{ type: number; data: string }>;
    };

    if (!data.Answer) return false;

    return data.Answer.some(
      (record) =>
        record.type === 5 &&
        record.data.replace(/\.$/, "").toLowerCase() === CNAME_TARGET.toLowerCase()
    );
  } catch {
    return false;
  }
}

async function checkTxtRecord(
  domain: string,
  verificationToken: string
): Promise<boolean> {
  try {
    const txtDomain = `_laundryshuttle-verify.${domain}`;
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(txtDomain)}&type=TXT`,
      { headers: { Accept: "application/dns-json" } }
    );

    if (!response.ok) return false;

    const data = await response.json() as {
      Answer?: Array<{ type: number; data: string }>;
    };

    if (!data.Answer) return false;

    return data.Answer.some(
      (record) =>
        record.type === 16 &&
        record.data.replace(/"/g, "").trim() === verificationToken
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Domain Management
// ---------------------------------------------------------------------------

export interface DomainSetupInfo {
  domain: string;
  verificationToken: string;
  cnameTarget: string;
  txtRecordName: string;
  status: string;
  verifiedAt: Date | null;
  lastCheckedAt: Date | null;
  failureReason: string | null;
}

/**
 * Initiate custom domain setup for a tenant.
 * Creates a verification record and returns DNS setup instructions.
 */
export async function initiateCustomDomain(
  tenantId: string,
  domain: string
): Promise<{ success: boolean; data?: DomainSetupInfo; error?: string }> {
  const cleaned = domain.toLowerCase().trim();

  // Validate format
  const validation = validateDomainFormat(cleaned);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Check if domain is already taken by another tenant
  const existing = await prisma.tenant.findUnique({
    where: { customDomain: cleaned },
    select: { id: true },
  });

  if (existing && existing.id !== tenantId) {
    return { success: false, error: "This domain is already in use by another business" };
  }

  // Check for existing pending verification for this domain
  const existingVerification = await prisma.customDomainVerification.findUnique({
    where: { domain: cleaned },
  });

  if (existingVerification && existingVerification.tenantId !== tenantId) {
    return { success: false, error: "This domain is already being configured by another business" };
  }

  const verificationToken = `laundryshuttle-verify=${nanoid(32)}`;
  const txtRecordName = `_laundryshuttle-verify.${cleaned}`;

  // Upsert verification record
  const verification = await prisma.customDomainVerification.upsert({
    where: { domain: cleaned },
    update: {
      tenantId,
      verificationToken,
      txtRecordName,
      status: "pending",
      failureReason: null,
      checkCount: 0,
      verifiedAt: null,
    },
    create: {
      tenantId,
      domain: cleaned,
      verificationToken,
      cnameTarget: CNAME_TARGET,
      txtRecordName,
      status: "pending",
    },
  });

  return {
    success: true,
    data: {
      domain: verification.domain,
      verificationToken: verification.verificationToken,
      cnameTarget: CNAME_TARGET,
      txtRecordName,
      status: verification.status,
      verifiedAt: verification.verifiedAt,
      lastCheckedAt: verification.lastCheckedAt,
      failureReason: verification.failureReason,
    },
  };
}

/**
 * Check and verify a pending domain.
 * If DNS is configured correctly, updates the tenant's customDomain field.
 */
export async function checkDomainVerification(
  tenantId: string,
  domain: string
): Promise<{ success: boolean; status: string; error?: string }> {
  const verification = await prisma.customDomainVerification.findUnique({
    where: { domain: domain.toLowerCase() },
  });

  if (!verification) {
    return { success: false, status: "not_found", error: "Domain verification not found" };
  }

  if (verification.tenantId !== tenantId) {
    return { success: false, status: "unauthorized", error: "Unauthorized" };
  }

  if (verification.status === "verified") {
    // Ensure domain is registered on Vercel (idempotent)
    await addDomainToVercel(verification.domain);
    return { success: true, status: "verified" };
  }

  // Perform DNS check
  const dnsResult = await verifyDomainDns(
    verification.domain,
    verification.verificationToken
  );

  if (dnsResult.verified) {
    // Mark as verified and assign to tenant
    await prisma.$transaction(async (tx) => {
      await tx.customDomainVerification.update({
        where: { domain: verification.domain },
        data: {
          status: "verified",
          verifiedAt: new Date(),
          lastCheckedAt: new Date(),
          verificationMethod: dnsResult.method,
          checkCount: { increment: 1 },
          failureReason: null,
        },
      });

      await tx.tenant.update({
        where: { id: tenantId },
        data: { customDomain: verification.domain },
      });
    });

    // Add domain to Vercel project for SSL provisioning
    const vercelResult = await addDomainToVercel(verification.domain);
    if (!vercelResult.success) {
      console.warn(
        `[custom-domains] Domain ${verification.domain} verified but Vercel add failed: ${vercelResult.error}`
      );
    }

    return { success: true, status: "verified" };
  }

  // Update failure info
  await prisma.customDomainVerification.update({
    where: { domain: verification.domain },
    data: {
      lastCheckedAt: new Date(),
      checkCount: { increment: 1 },
      failureReason: dnsResult.error || "DNS records not configured correctly",
      status: verification.checkCount >= 100 ? "expired" : "pending",
    },
  });

  return {
    success: false,
    status: "pending",
    error: dnsResult.error || "DNS records not configured correctly. Please check your DNS settings.",
  };
}

/**
 * Remove a custom domain from a tenant.
 */
export async function removeCustomDomain(
  tenantId: string,
  domain: string
): Promise<{ success: boolean; error?: string }> {
  const cleaned = domain.toLowerCase().trim();

  try {
    // Remove verification record
    const verification = await prisma.customDomainVerification.findUnique({
      where: { domain: cleaned },
    });

    if (verification && verification.tenantId !== tenantId) {
      return { success: false, error: "Unauthorized" };
    }

    // Remove domain from Vercel project
    const vercelResult = await removeDomainFromVercel(cleaned);
    if (!vercelResult.success) {
      console.warn(
        `[custom-domains] Vercel domain removal failed for ${cleaned}: ${vercelResult.error}`
      );
    }

    // Remove in transaction
    await prisma.$transaction(async (tx) => {
      // Remove from tenant
      await tx.tenant.update({
        where: { id: tenantId },
        data: { customDomain: null },
      });

      // Remove verification record if exists
      if (verification) {
        await tx.customDomainVerification.delete({
          where: { domain: cleaned },
        });
      }
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to remove custom domain" };
  }
}

/**
 * Get current custom domain status for a tenant.
 */
export async function getCustomDomainStatus(
  tenantId: string
): Promise<{
  currentDomain: string | null;
  verification: DomainSetupInfo | null;
}> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { customDomain: true },
  });

  const verification = await prisma.customDomainVerification.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return {
    currentDomain: tenant?.customDomain ?? null,
    verification: verification
      ? {
          domain: verification.domain,
          verificationToken: verification.verificationToken,
          cnameTarget: verification.cnameTarget,
          txtRecordName: verification.txtRecordName ?? `_laundryshuttle-verify.${verification.domain}`,
          status: verification.status,
          verifiedAt: verification.verifiedAt,
          lastCheckedAt: verification.lastCheckedAt,
          failureReason: verification.failureReason,
        }
      : null,
  };
}

/**
 * Get all custom domain verifications (platform admin).
 */
export async function getAllDomainVerifications(): Promise<
  Array<
    DomainSetupInfo & {
      id: string;
      tenantId: string;
      checkCount: number;
      createdAt: Date;
    }
  >
> {
  const verifications = await prisma.customDomainVerification.findMany({
    orderBy: { createdAt: "desc" },
  });

  return verifications.map((v) => ({
    id: v.id,
    tenantId: v.tenantId,
    domain: v.domain,
    verificationToken: v.verificationToken,
    cnameTarget: v.cnameTarget,
    txtRecordName: v.txtRecordName ?? `_laundryshuttle-verify.${v.domain}`,
    status: v.status,
    verifiedAt: v.verifiedAt,
    lastCheckedAt: v.lastCheckedAt,
    failureReason: v.failureReason,
    checkCount: v.checkCount,
    createdAt: v.createdAt,
  }));
}
