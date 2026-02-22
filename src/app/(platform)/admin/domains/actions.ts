"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import prisma from "@/lib/prisma";
import {
  getAllDomainVerifications,
  checkDomainVerification,
  removeCustomDomain,
} from "@/lib/custom-domains";

export type AdminDomainActionState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function getAdminDomainData() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const verifications = await getAllDomainVerifications();

  // Get tenant names for each verification
  const tenantIds = [...new Set(verifications.map((v) => v.tenantId))];
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, slug: true, businessName: true, customDomain: true },
  });

  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  return verifications.map((v) => ({
    ...v,
    tenant: tenantMap.get(v.tenantId) || {
      id: v.tenantId,
      slug: "unknown",
      businessName: "Unknown",
      customDomain: null,
    },
  }));
}

export async function adminVerifyDomain(
  tenantId: string,
  domain: string
): Promise<AdminDomainActionState> {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const result = await checkDomainVerification(tenantId, domain);

  revalidatePath("/admin/domains");

  if (result.success) {
    return { success: true, message: `Domain ${domain} verified successfully` };
  }

  return { error: result.error || "Verification failed" };
}

export async function adminRemoveDomain(
  tenantId: string,
  domain: string
): Promise<AdminDomainActionState> {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const result = await removeCustomDomain(tenantId, domain);

  revalidatePath("/admin/domains");
  revalidatePath("/admin/tenants");

  if (result.success) {
    return { success: true, message: `Domain ${domain} removed` };
  }

  return { error: result.error || "Failed to remove domain" };
}

export async function adminForceAssignDomain(
  tenantId: string,
  domain: string
): Promise<AdminDomainActionState> {
  await requireRole(UserRole.PLATFORM_ADMIN);

  try {
    // Check domain isn't taken by another tenant
    const existing = await prisma.tenant.findUnique({
      where: { customDomain: domain },
      select: { id: true },
    });

    if (existing && existing.id !== tenantId) {
      return { error: "Domain is already assigned to another tenant" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: { customDomain: domain },
      });

      // Also update verification record if it exists
      const verification = await tx.customDomainVerification.findUnique({
        where: { domain },
      });

      if (verification) {
        await tx.customDomainVerification.update({
          where: { domain },
          data: { status: "verified", verifiedAt: new Date() },
        });
      }
    });

    revalidatePath("/admin/domains");
    revalidatePath(`/admin/tenants/${tenantId}`);

    return { success: true, message: `Domain ${domain} assigned to tenant` };
  } catch {
    return { error: "Failed to assign domain" };
  }
}
