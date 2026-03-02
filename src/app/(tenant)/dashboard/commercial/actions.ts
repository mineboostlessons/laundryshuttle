"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { createCustomerOnConnectedAccount } from "@/lib/stripe";
import { z } from "zod";

const createAccountSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().optional(),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional(),
  billingAddress: z.string().optional(),
  paymentTerms: z.enum(["net_7", "net_15", "net_30"]),
  billingCycle: z.enum(["weekly", "biweekly", "monthly"]),
  preferredPayment: z.enum(["ach", "card"]),
  creditLimit: z.number().min(0).optional(),
  negotiatedRates: z.record(z.number()).optional(),
});

export async function getCommercialAccounts() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const accounts = await prisma.commercialAccount.findMany({
    where: { tenantId: tenant.id },
    include: {
      _count: { select: { orders: true, invoices: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return accounts;
}

export async function createCommercialAccount(data: z.infer<typeof createAccountSchema>) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const result = createAccountSchema.safeParse(data);
  if (!result.success) {
    return { success: false as const, error: result.error.errors[0].message };
  }
  const validated = result.data;

  // Create Stripe customer on connected account if tenant has Stripe
  let stripeCustomerId: string | undefined;
  if (tenant.stripeConnectAccountId) {
    const stripeCustomer = await createCustomerOnConnectedAccount({
      connectedAccountId: tenant.stripeConnectAccountId,
      email: validated.contactEmail,
      name: validated.companyName,
      metadata: { tenantId: tenant.id },
    });
    stripeCustomerId = stripeCustomer.id;
  }

  const account = await prisma.commercialAccount.create({
    data: {
      tenantId: tenant.id,
      companyName: validated.companyName,
      contactName: validated.contactName,
      contactEmail: validated.contactEmail,
      contactPhone: validated.contactPhone,
      billingAddress: validated.billingAddress,
      paymentTerms: validated.paymentTerms,
      billingCycle: validated.billingCycle,
      preferredPayment: validated.preferredPayment,
      creditLimit: validated.creditLimit,
      negotiatedRates: validated.negotiatedRates ?? {},
      stripeCustomerId,
    },
  });

  return account;
}

const updateAccountSchema = createAccountSchema.partial();

export async function updateCommercialAccount(
  accountId: string,
  data: Partial<z.infer<typeof createAccountSchema>>
) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const parsed = updateAccountSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0].message };
  }

  const validated = parsed.data;

  const account = await prisma.commercialAccount.update({
    where: { id: accountId, tenantId: tenant.id },
    data: {
      ...(validated.companyName && { companyName: validated.companyName }),
      ...(validated.contactName !== undefined && { contactName: validated.contactName }),
      ...(validated.contactEmail && { contactEmail: validated.contactEmail }),
      ...(validated.contactPhone !== undefined && { contactPhone: validated.contactPhone }),
      ...(validated.billingAddress !== undefined && { billingAddress: validated.billingAddress }),
      ...(validated.paymentTerms && { paymentTerms: validated.paymentTerms }),
      ...(validated.billingCycle && { billingCycle: validated.billingCycle }),
      ...(validated.preferredPayment && { preferredPayment: validated.preferredPayment }),
      ...(validated.creditLimit !== undefined && { creditLimit: validated.creditLimit }),
      ...(validated.negotiatedRates && { negotiatedRates: validated.negotiatedRates }),
    },
  });

  return account;
}

export async function toggleCommercialAccount(accountId: string, isActive: boolean) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  return prisma.commercialAccount.update({
    where: { id: accountId, tenantId: tenant.id },
    data: { isActive },
  });
}
