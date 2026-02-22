"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";

// =============================================================================
// TYPES
// =============================================================================

export interface MigrationError {
  row: number;
  field?: string;
  message: string;
}

export interface MigrationResult {
  success: boolean;
  migrationLogId: string;
  totalRecords: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: MigrationError[];
}

export interface ColumnMapping {
  [sourceColumn: string]: string; // sourceColumn -> targetField
}

// =============================================================================
// CSV PARSING
// =============================================================================

export async function parseCsvToRows(csvText: string): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j]?.trim() ?? "";
    }
    rows.push(row);
  }

  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

import { IMPORT_FIELD_DEFINITIONS } from "./migration-constants";
import type { ImportOperationType } from "./migration-constants";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const customerRowSchema = z.object({
  email: z.string().email("Invalid email"),
  firstName: z.string().optional().default(""),
  lastName: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  addressLine1: z.string().optional().default(""),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  zip: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

const orderRowSchema = z.object({
  customerEmail: z.string().email("Invalid customer email"),
  status: z.string().min(1, "Status required"),
  totalAmount: z.coerce.number().min(0, "Must be >= 0"),
  orderNumber: z.string().optional().default(""),
  orderType: z.string().optional().default("delivery"),
  subtotal: z.coerce.number().optional().default(0),
  taxAmount: z.coerce.number().optional().default(0),
  deliveryFee: z.coerce.number().optional().default(0),
  createdAt: z.string().optional().default(""),
  pickupDate: z.string().optional().default(""),
  deliveryDate: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

const serviceRowSchema = z.object({
  name: z.string().min(1, "Name required"),
  category: z.string().min(1, "Category required"),
  pricingType: z.string().min(1, "Pricing type required"),
  price: z.coerce.number().min(0, "Must be >= 0"),
  description: z.string().optional().default(""),
  icon: z.string().optional().default(""),
  sortOrder: z.coerce.number().optional().default(0),
  taxable: z.string().optional().default("true"),
});

const promoCodeRowSchema = z.object({
  code: z.string().min(1, "Code required"),
  discountType: z.string().min(1, "Discount type required"),
  discountValue: z.coerce.number().min(0, "Must be >= 0"),
  description: z.string().optional().default(""),
  minOrderAmount: z.coerce.number().optional().default(0),
  maxUses: z.coerce.number().optional(),
  validFrom: z.string().optional().default(""),
  validUntil: z.string().optional().default(""),
});

// =============================================================================
// BATCH IMPORT FUNCTIONS
// =============================================================================

export async function importCustomers(
  tenantId: string,
  rows: Record<string, string>[],
  columnMapping: ColumnMapping,
  userId: string
): Promise<MigrationResult> {
  const migrationLog = await prisma.migrationLog.create({
    data: {
      tenantId,
      operationType: "import_customers",
      sourceFormat: "csv",
      status: "processing",
      totalRecords: rows.length,
      columnMapping: columnMapping as Record<string, string>,
      createdByUserId: userId,
      startedAt: new Date(),
    },
  });

  const errors: MigrationError[] = [];
  let successCount = 0;
  let skippedCount = 0;

  // Get existing customer emails to avoid duplicates
  const existingUsers = await prisma.user.findMany({
    where: { tenantId, role: "customer" },
    select: { email: true },
  });
  const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (let j = 0; j < batch.length; j++) {
      const rowIndex = i + j + 2; // +2 for 1-indexed + header row
      const mappedRow = applyColumnMapping(batch[j], columnMapping);
      const parsed = customerRowSchema.safeParse(mappedRow);

      if (!parsed.success) {
        errors.push({
          row: rowIndex,
          field: parsed.error.errors[0]?.path[0]?.toString(),
          message: parsed.error.errors[0]?.message ?? "Validation error",
        });
        continue;
      }

      if (existingEmails.has(parsed.data.email.toLowerCase())) {
        skippedCount++;
        continue;
      }

      try {
        await prisma.user.create({
          data: {
            tenantId,
            email: parsed.data.email,
            firstName: parsed.data.firstName || null,
            lastName: parsed.data.lastName || null,
            phone: parsed.data.phone || null,
            role: "customer",
            authProvider: "email",
          },
        });

        // Create address if provided
        if (parsed.data.addressLine1) {
          const user = await prisma.user.findFirst({
            where: { tenantId, email: parsed.data.email },
          });
          if (user) {
            await prisma.customerAddress.create({
              data: {
                userId: user.id,
                addressLine1: parsed.data.addressLine1,
                city: parsed.data.city || "",
                state: parsed.data.state || "",
                zip: parsed.data.zip || "",
                isDefault: true,
                pickupNotes: parsed.data.notes || null,
              },
            });
          }
        }

        existingEmails.add(parsed.data.email.toLowerCase());
        successCount++;
      } catch (err) {
        errors.push({
          row: rowIndex,
          field: "email",
          message: err instanceof Error ? err.message : "Failed to create customer",
        });
      }
    }
  }

  const finalStatus = errors.length === rows.length ? "failed" : "completed";
  await prisma.migrationLog.update({
    where: { id: migrationLog.id },
    data: {
      status: finalStatus,
      successCount,
      failedCount: errors.length,
      skippedCount,
      errorLog: errors.length > 0 ? (errors as unknown as Record<string, unknown>[]) : undefined,
      completedAt: new Date(),
    },
  });

  return {
    success: finalStatus === "completed",
    migrationLogId: migrationLog.id,
    totalRecords: rows.length,
    successCount,
    failedCount: errors.length,
    skippedCount,
    errors,
  };
}

export async function importServices(
  tenantId: string,
  rows: Record<string, string>[],
  columnMapping: ColumnMapping,
  userId: string
): Promise<MigrationResult> {
  const migrationLog = await prisma.migrationLog.create({
    data: {
      tenantId,
      operationType: "import_services",
      sourceFormat: "csv",
      status: "processing",
      totalRecords: rows.length,
      columnMapping: columnMapping as Record<string, string>,
      createdByUserId: userId,
      startedAt: new Date(),
    },
  });

  const errors: MigrationError[] = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i + 2;
    const mappedRow = applyColumnMapping(rows[i], columnMapping);
    const parsed = serviceRowSchema.safeParse(mappedRow);

    if (!parsed.success) {
      errors.push({
        row: rowIndex,
        field: parsed.error.errors[0]?.path[0]?.toString(),
        message: parsed.error.errors[0]?.message ?? "Validation error",
      });
      continue;
    }

    try {
      await prisma.service.create({
        data: {
          tenantId,
          name: parsed.data.name,
          category: parsed.data.category,
          pricingType: parsed.data.pricingType,
          price: parsed.data.price,
          description: parsed.data.description || null,
          icon: parsed.data.icon || null,
          sortOrder: parsed.data.sortOrder,
          taxable: parsed.data.taxable !== "false",
        },
      });
      successCount++;
    } catch (err) {
      errors.push({
        row: rowIndex,
        field: "name",
        message: err instanceof Error ? err.message : "Failed to create service",
      });
    }
  }

  const finalStatus = errors.length === rows.length ? "failed" : "completed";
  await prisma.migrationLog.update({
    where: { id: migrationLog.id },
    data: {
      status: finalStatus,
      successCount,
      failedCount: errors.length,
      errorLog: errors.length > 0 ? (errors as unknown as Record<string, unknown>[]) : undefined,
      completedAt: new Date(),
    },
  });

  return {
    success: finalStatus === "completed",
    migrationLogId: migrationLog.id,
    totalRecords: rows.length,
    successCount,
    failedCount: errors.length,
    skippedCount: 0,
    errors,
  };
}

export async function importOrders(
  tenantId: string,
  rows: Record<string, string>[],
  columnMapping: ColumnMapping,
  userId: string,
  laundromatId: string
): Promise<MigrationResult> {
  const migrationLog = await prisma.migrationLog.create({
    data: {
      tenantId,
      operationType: "import_orders",
      sourceFormat: "csv",
      status: "processing",
      totalRecords: rows.length,
      columnMapping: columnMapping as Record<string, string>,
      createdByUserId: userId,
      startedAt: new Date(),
    },
  });

  const errors: MigrationError[] = [];
  let successCount = 0;
  let skippedCount = 0;

  // Build email-to-userId map
  const customers = await prisma.user.findMany({
    where: { tenantId, role: "customer" },
    select: { id: true, email: true },
  });
  const emailToId = new Map(customers.map((c) => [c.email.toLowerCase(), c.id]));

  // Get existing order count for numbering
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
  const prefix = (tenant?.slug ?? "LS").toUpperCase().slice(0, 3);
  let orderCounter = await prisma.order.count({ where: { tenantId } });

  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (let j = 0; j < batch.length; j++) {
      const rowIndex = i + j + 2;
      const mappedRow = applyColumnMapping(batch[j], columnMapping);
      const parsed = orderRowSchema.safeParse(mappedRow);

      if (!parsed.success) {
        errors.push({
          row: rowIndex,
          field: parsed.error.errors[0]?.path[0]?.toString(),
          message: parsed.error.errors[0]?.message ?? "Validation error",
        });
        continue;
      }

      const customerId = emailToId.get(parsed.data.customerEmail.toLowerCase());
      if (!customerId) {
        skippedCount++;
        errors.push({ row: rowIndex, field: "customerEmail", message: "Customer not found" });
        continue;
      }

      try {
        orderCounter++;
        const orderNumber = parsed.data.orderNumber || `${prefix}-MIG-${String(orderCounter).padStart(5, "0")}`;
        const createdAt = parsed.data.createdAt ? new Date(parsed.data.createdAt) : new Date();

        await prisma.order.create({
          data: {
            tenantId,
            laundromatId,
            customerId,
            orderNumber,
            orderType: parsed.data.orderType || "delivery",
            status: parsed.data.status,
            subtotal: parsed.data.subtotal,
            taxAmount: parsed.data.taxAmount,
            deliveryFee: parsed.data.deliveryFee,
            totalAmount: parsed.data.totalAmount,
            specialInstructions: parsed.data.notes || null,
            pickupDate: parsed.data.pickupDate ? new Date(parsed.data.pickupDate) : null,
            deliveryDate: parsed.data.deliveryDate ? new Date(parsed.data.deliveryDate) : null,
            createdAt,
          },
        });
        successCount++;
      } catch (err) {
        errors.push({
          row: rowIndex,
          message: err instanceof Error ? err.message : "Failed to create order",
        });
      }
    }
  }

  const finalStatus = errors.length === rows.length ? "failed" : "completed";
  await prisma.migrationLog.update({
    where: { id: migrationLog.id },
    data: {
      status: finalStatus,
      successCount,
      failedCount: errors.length,
      skippedCount,
      errorLog: errors.length > 0 ? (errors as unknown as Record<string, unknown>[]) : undefined,
      completedAt: new Date(),
    },
  });

  return {
    success: finalStatus === "completed",
    migrationLogId: migrationLog.id,
    totalRecords: rows.length,
    successCount,
    failedCount: errors.length,
    skippedCount,
    errors,
  };
}

export async function importPromoCodes(
  tenantId: string,
  rows: Record<string, string>[],
  columnMapping: ColumnMapping,
  userId: string
): Promise<MigrationResult> {
  const migrationLog = await prisma.migrationLog.create({
    data: {
      tenantId,
      operationType: "import_promo_codes",
      sourceFormat: "csv",
      status: "processing",
      totalRecords: rows.length,
      columnMapping: columnMapping as Record<string, string>,
      createdByUserId: userId,
      startedAt: new Date(),
    },
  });

  const errors: MigrationError[] = [];
  let successCount = 0;
  let skippedCount = 0;

  const existingCodes = await prisma.promoCode.findMany({
    where: { tenantId },
    select: { code: true },
  });
  const existingCodeSet = new Set(existingCodes.map((c) => c.code.toUpperCase()));

  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i + 2;
    const mappedRow = applyColumnMapping(rows[i], columnMapping);
    const parsed = promoCodeRowSchema.safeParse(mappedRow);

    if (!parsed.success) {
      errors.push({
        row: rowIndex,
        field: parsed.error.errors[0]?.path[0]?.toString(),
        message: parsed.error.errors[0]?.message ?? "Validation error",
      });
      continue;
    }

    if (existingCodeSet.has(parsed.data.code.toUpperCase())) {
      skippedCount++;
      continue;
    }

    try {
      await prisma.promoCode.create({
        data: {
          tenantId,
          code: parsed.data.code.toUpperCase(),
          discountType: parsed.data.discountType,
          discountValue: parsed.data.discountValue,
          description: parsed.data.description || null,
          minOrderAmount: parsed.data.minOrderAmount || null,
          maxUses: parsed.data.maxUses ?? null,
          validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : new Date(),
          validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
        },
      });
      existingCodeSet.add(parsed.data.code.toUpperCase());
      successCount++;
    } catch (err) {
      errors.push({
        row: rowIndex,
        field: "code",
        message: err instanceof Error ? err.message : "Failed to create promo code",
      });
    }
  }

  const finalStatus = errors.length === rows.length ? "failed" : "completed";
  await prisma.migrationLog.update({
    where: { id: migrationLog.id },
    data: {
      status: finalStatus,
      successCount,
      failedCount: errors.length,
      skippedCount,
      errorLog: errors.length > 0 ? (errors as unknown as Record<string, unknown>[]) : undefined,
      completedAt: new Date(),
    },
  });

  return {
    success: finalStatus === "completed",
    migrationLogId: migrationLog.id,
    totalRecords: rows.length,
    successCount,
    failedCount: errors.length,
    skippedCount,
    errors,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function applyColumnMapping(row: Record<string, string>, mapping: ColumnMapping): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [sourceCol, targetField] of Object.entries(mapping)) {
    if (targetField && row[sourceCol] !== undefined) {
      mapped[targetField] = row[sourceCol];
    }
  }
  return mapped;
}

export async function getMigrationLogs(tenantId: string) {
  return prisma.migrationLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getMigrationLog(tenantId: string, id: string) {
  return prisma.migrationLog.findFirst({
    where: { id, tenantId },
  });
}

export async function generateCsvTemplate(operationType: ImportOperationType): Promise<string> {
  const fields = IMPORT_FIELD_DEFINITIONS[operationType];
  const allFields = [...fields.required, ...fields.optional];
  return allFields.join(",") + "\n";
}
