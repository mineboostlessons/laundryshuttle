"use server";

import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";
import {
  parseCsvToRows,
  importCustomers,
  importServices,
  importOrders,
  importPromoCodes,
  getMigrationLogs,
  getMigrationLog,
  generateCsvTemplate,
  type ColumnMapping,
  type MigrationResult,
} from "@/lib/migration";
import { IMPORT_FIELD_DEFINITIONS, type ImportOperationType } from "@/lib/migration-constants";
import prisma from "@/lib/prisma";

export type MigrationActionState = {
  success: boolean;
  error?: string;
  result?: MigrationResult;
};

// Get all migration logs for this tenant
export async function getMigrations() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();
  return getMigrationLogs(tenant.id);
}

// Get a single migration log detail
export async function getMigrationDetail(migrationId: string) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();
  return getMigrationLog(tenant.id, migrationId);
}

// Preview CSV: parse and return headers + first 5 rows for column mapping
export async function previewCsv(csvText: string): Promise<{
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
}> {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);

  const { headers, rows } = await parseCsvToRows(csvText);
  return {
    headers,
    sampleRows: rows.slice(0, 5),
    totalRows: rows.length,
  };
}

// Execute import with column mapping
export async function executeImport(
  operationType: ImportOperationType,
  csvText: string,
  columnMapping: ColumnMapping,
  laundromatId?: string
): Promise<MigrationActionState> {
  const session = await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const { rows } = await parseCsvToRows(csvText);

  if (rows.length === 0) {
    return { success: false, error: "CSV file contains no data rows" };
  }

  if (rows.length > 10000) {
    return { success: false, error: "Maximum 10,000 rows per import" };
  }

  let result: MigrationResult;

  switch (operationType) {
    case "import_customers":
      result = await importCustomers(tenant.id, rows, columnMapping, session.user.id);
      break;
    case "import_services":
      result = await importServices(tenant.id, rows, columnMapping, session.user.id);
      break;
    case "import_orders": {
      if (!laundromatId) {
        return { success: false, error: "Please select a location for order import" };
      }
      result = await importOrders(tenant.id, rows, columnMapping, session.user.id, laundromatId);
      break;
    }
    case "import_promo_codes":
      result = await importPromoCodes(tenant.id, rows, columnMapping, session.user.id);
      break;
    default:
      return { success: false, error: "Invalid import type" };
  }

  revalidatePath("/dashboard/migrations");
  return { success: result.success, result };
}

// Get template CSV for a given import type
export async function downloadTemplate(operationType: ImportOperationType): Promise<string> {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  return await generateCsvTemplate(operationType);
}

// Get field definitions for a given import type
export async function getFieldDefinitions(operationType: ImportOperationType) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  return IMPORT_FIELD_DEFINITIONS[operationType];
}

// Get locations for order import
export async function getLocations() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();
  return prisma.laundromat.findMany({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true, name: true },
  });
}
