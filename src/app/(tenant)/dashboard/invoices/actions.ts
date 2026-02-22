"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import {
  createStripeInvoice,
  createStripeInvoiceItem,
  sendStripeInvoice,
  voidStripeInvoice,
  markStripeInvoicePaid,
} from "@/lib/stripe";
import { triggerWebhook } from "@/lib/webhooks";
import { z } from "zod";

const createInvoiceSchema = z.object({
  commercialAccountId: z.string().min(1),
  lineItems: z.array(
    z.object({
      description: z.string().min(1),
      amount: z.number().positive(),
    })
  ).min(1, "At least one line item is required"),
  notes: z.string().optional(),
});

export async function getInvoices(filters?: {
  status?: string;
  commercialAccountId?: string;
}) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  // Get all commercial accounts for this tenant to filter invoices
  const commercialAccountIds = await prisma.commercialAccount.findMany({
    where: { tenantId: tenant.id },
    select: { id: true },
  });

  const where: Record<string, unknown> = {
    commercialAccountId: {
      in: commercialAccountIds.map((a) => a.id),
    },
  };

  if (filters?.status && filters.status !== "all") {
    where.status = filters.status;
  }
  if (filters?.commercialAccountId) {
    where.commercialAccountId = filters.commercialAccountId;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      commercialAccount: {
        select: {
          companyName: true,
          contactEmail: true,
          paymentTerms: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return invoices;
}

export async function createInvoice(data: z.infer<typeof createInvoiceSchema>) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const validated = createInvoiceSchema.parse(data);

  // Verify account belongs to this tenant
  const account = await prisma.commercialAccount.findFirst({
    where: { id: validated.commercialAccountId, tenantId: tenant.id },
  });

  if (!account) {
    throw new Error("Commercial account not found");
  }

  // Calculate totals
  const subtotal = validated.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxRate = tenant.defaultTaxRate ?? 0;
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  // Generate invoice number
  const invoiceCount = await prisma.invoice.count({
    where: {
      commercialAccount: { tenantId: tenant.id },
    },
  });
  const prefix = tenant.slug.substring(0, 3).toUpperCase();
  const invoiceNumber = `INV-${prefix}-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, "0")}`;

  // Determine due date from payment terms
  const daysMap: Record<string, number> = { net_7: 7, net_15: 15, net_30: 30 };
  const dueDays = daysMap[account.paymentTerms] ?? 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);

  // Create Stripe invoice if connected
  let stripeInvoiceId: string | undefined;
  if (tenant.stripeConnectAccountId && account.stripeCustomerId) {
    const stripeInvoice = await createStripeInvoice({
      connectedAccountId: tenant.stripeConnectAccountId,
      customerId: account.stripeCustomerId,
      daysUntilDue: dueDays,
      metadata: { tenantId: tenant.id, invoiceNumber },
    });
    stripeInvoiceId = stripeInvoice.id;

    // Add line items
    for (const item of validated.lineItems) {
      await createStripeInvoiceItem({
        connectedAccountId: tenant.stripeConnectAccountId,
        customerId: account.stripeCustomerId,
        amount: item.amount,
        description: item.description,
        invoiceId: stripeInvoice.id,
      });
    }
  }

  const now = new Date();
  const invoice = await prisma.invoice.create({
    data: {
      commercialAccountId: account.id,
      invoiceNumber,
      stripeInvoiceId,
      billingPeriodStart: new Date(now.getFullYear(), now.getMonth(), 1),
      billingPeriodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      subtotal,
      taxAmount,
      totalAmount,
      status: "draft",
      dueDate,
    },
    include: {
      commercialAccount: {
        select: { companyName: true, contactEmail: true, paymentTerms: true },
      },
    },
  });

  await triggerWebhook({
    tenantId: tenant.id,
    event: "invoice.created",
    data: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      companyName: account.companyName,
      totalAmount: invoice.totalAmount,
    },
  });

  return invoice;
}

export async function sendInvoice(invoiceId: string) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      commercialAccount: { tenantId: tenant.id },
    },
    include: { commercialAccount: true },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "draft") throw new Error("Only draft invoices can be sent");

  // Send via Stripe if available
  if (tenant.stripeConnectAccountId && invoice.stripeInvoiceId) {
    await sendStripeInvoice({
      connectedAccountId: tenant.stripeConnectAccountId,
      invoiceId: invoice.stripeInvoiceId,
    });
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "sent" },
    include: {
      commercialAccount: {
        select: { companyName: true, contactEmail: true, paymentTerms: true },
      },
    },
  });

  await triggerWebhook({
    tenantId: tenant.id,
    event: "invoice.sent",
    data: {
      invoiceId: updated.id,
      invoiceNumber: updated.invoiceNumber,
      companyName: invoice.commercialAccount.companyName,
      totalAmount: updated.totalAmount,
    },
  });

  return updated;
}

export async function markInvoicePaid(invoiceId: string) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      commercialAccount: { tenantId: tenant.id },
      status: { in: ["sent", "overdue"] },
    },
    include: { commercialAccount: true },
  });

  if (!invoice) throw new Error("Invoice not found or cannot be marked as paid");

  // Mark paid in Stripe if available
  if (tenant.stripeConnectAccountId && invoice.stripeInvoiceId) {
    await markStripeInvoicePaid({
      connectedAccountId: tenant.stripeConnectAccountId,
      invoiceId: invoice.stripeInvoiceId,
    });
  }

  // Update balance on commercial account
  await prisma.commercialAccount.update({
    where: { id: invoice.commercialAccountId },
    data: {
      currentBalance: {
        decrement: invoice.totalAmount,
      },
    },
  });

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "paid", paidAt: new Date() },
    include: {
      commercialAccount: {
        select: { companyName: true, contactEmail: true, paymentTerms: true },
      },
    },
  });

  await triggerWebhook({
    tenantId: tenant.id,
    event: "invoice.paid",
    data: {
      invoiceId: updated.id,
      invoiceNumber: updated.invoiceNumber,
      companyName: invoice.commercialAccount.companyName,
      totalAmount: updated.totalAmount,
    },
  });

  return updated;
}

export async function voidInvoice(invoiceId: string) {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      commercialAccount: { tenantId: tenant.id },
      status: { in: ["draft", "sent"] },
    },
  });

  if (!invoice) throw new Error("Invoice not found or cannot be voided");

  if (tenant.stripeConnectAccountId && invoice.stripeInvoiceId && invoice.status !== "draft") {
    await voidStripeInvoice({
      connectedAccountId: tenant.stripeConnectAccountId,
      invoiceId: invoice.stripeInvoiceId,
    });
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "void" },
    include: {
      commercialAccount: {
        select: { companyName: true, contactEmail: true, paymentTerms: true },
      },
    },
  });
}

export async function getInvoiceStats() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const commercialAccountIds = await prisma.commercialAccount.findMany({
    where: { tenantId: tenant.id },
    select: { id: true },
  });

  const ids = commercialAccountIds.map((a) => a.id);

  const [totalOutstanding, totalPaid, overdueCount] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        commercialAccountId: { in: ids },
        status: { in: ["sent", "overdue"] },
      },
      _sum: { totalAmount: true },
    }),
    prisma.invoice.aggregate({
      where: {
        commercialAccountId: { in: ids },
        status: "paid",
      },
      _sum: { totalAmount: true },
    }),
    prisma.invoice.count({
      where: {
        commercialAccountId: { in: ids },
        status: "overdue",
      },
    }),
  ]);

  return {
    totalOutstanding: totalOutstanding._sum.totalAmount ?? 0,
    totalPaid: totalPaid._sum.totalAmount ?? 0,
    overdueCount,
  };
}
