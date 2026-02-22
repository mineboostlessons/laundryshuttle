"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import {
  initiateCustomDomain,
  checkDomainVerification,
  removeCustomDomain,
  getCustomDomainStatus,
} from "@/lib/custom-domains";

export type DomainActionState = {
  error?: string;
  success?: boolean;
  message?: string;
};

const addDomainSchema = z.object({
  domain: z.string().min(4, "Domain must be at least 4 characters"),
});

export async function addCustomDomainAction(
  _prev: DomainActionState,
  formData: FormData
): Promise<DomainActionState> {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const parsed = addDomainSchema.safeParse({
    domain: formData.get("domain"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const result = await initiateCustomDomain(tenant.id, parsed.data.domain);

  if (!result.success) {
    return { error: result.error };
  }

  revalidatePath("/settings/domains");
  return {
    success: true,
    message: "Domain added. Configure your DNS records below, then click Verify.",
  };
}

export async function verifyDomainAction(): Promise<DomainActionState> {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const status = await getCustomDomainStatus(tenant.id);

  if (!status.verification) {
    return { error: "No domain configured" };
  }

  const result = await checkDomainVerification(
    tenant.id,
    status.verification.domain
  );

  revalidatePath("/settings/domains");

  if (result.success) {
    return { success: true, message: "Domain verified successfully!" };
  }

  return { error: result.error || "Verification failed" };
}

export async function removeDomainAction(): Promise<DomainActionState> {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const status = await getCustomDomainStatus(tenant.id);

  if (!status.verification && !status.currentDomain) {
    return { error: "No domain configured" };
  }

  const domain = status.currentDomain || status.verification?.domain;
  if (!domain) {
    return { error: "No domain to remove" };
  }

  const result = await removeCustomDomain(tenant.id, domain);

  revalidatePath("/settings/domains");

  if (result.success) {
    return { success: true, message: "Custom domain removed" };
  }

  return { error: result.error || "Failed to remove domain" };
}

export async function getDomainStatusAction() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();
  return getCustomDomainStatus(tenant.id);
}
