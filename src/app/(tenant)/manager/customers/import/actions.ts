"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { z } from "zod";

const customerRowSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

export type CustomerRow = z.infer<typeof customerRowSchema>;

export interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: Array<{ row: number; email: string; error: string }>;
}

export async function parseCSV(csvText: string): Promise<{
  rows: CustomerRow[];
  errors: Array<{ row: number; error: string }>;
}> {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);

  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    return { rows: [], errors: [{ row: 0, error: "CSV must have a header row and at least one data row" }] };
  }

  const headerLine = lines[0].toLowerCase().replace(/\r/g, "");
  const headers = headerLine.split(",").map((h) => h.trim());

  const requiredHeaders = ["firstname", "lastname", "email"];
  const missing = requiredHeaders.filter(
    (h) =>
      !headers.includes(h) &&
      !headers.includes(h.replace("name", "_name")) &&
      !headers.includes(
        h === "firstname"
          ? "first_name"
          : h === "lastname"
            ? "last_name"
            : h
      )
  );

  if (missing.length > 0) {
    return {
      rows: [],
      errors: [{ row: 0, error: `Missing required columns: ${missing.join(", ")}` }],
    };
  }

  // Normalize header names
  const normalizedHeaders = headers.map((h) => {
    const mapping: Record<string, string> = {
      first_name: "firstName",
      firstname: "firstName",
      last_name: "lastName",
      lastname: "lastName",
      email: "email",
      phone: "phone",
      address: "addressLine1",
      addressline1: "addressLine1",
      address_line_1: "addressLine1",
      addressline2: "addressLine2",
      address_line_2: "addressLine2",
      apt: "addressLine2",
      city: "city",
      state: "state",
      zip: "zip",
      zipcode: "zip",
      zip_code: "zip",
    };
    return mapping[h] ?? h;
  });

  const rows: CustomerRow[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r/g, "").trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const rowObj: Record<string, string> = {};

    normalizedHeaders.forEach((header, idx) => {
      if (values[idx] !== undefined) {
        rowObj[header] = values[idx].trim();
      }
    });

    const parsed = customerRowSchema.safeParse(rowObj);
    if (parsed.success) {
      rows.push(parsed.data);
    } else {
      const fieldErrors = parsed.error.issues.map((e) => e.message).join("; ");
      errors.push({ row: i + 1, error: fieldErrors });
    }
  }

  return { rows, errors };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export async function importCustomers(
  rows: CustomerRow[]
): Promise<ImportResult> {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const result: ImportResult = {
    total: rows.length,
    created: 0,
    skipped: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // Check for duplicate by email + tenant
      const existing = await prisma.user.findFirst({
        where: { email: row.email, tenantId: tenant.id },
      });

      if (existing) {
        result.skipped++;
        continue;
      }

      const user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          phone: row.phone ?? null,
          role: "customer",
          authProvider: "email",
        },
      });

      // Create address if provided
      if (row.addressLine1 && row.city && row.state && row.zip) {
        await prisma.customerAddress.create({
          data: {
            userId: user.id,
            label: "Home",
            addressLine1: row.addressLine1,
            addressLine2: row.addressLine2 ?? null,
            city: row.city,
            state: row.state,
            zip: row.zip,
            isDefault: true,
          },
        });
      }

      result.created++;
    } catch (err) {
      result.errors.push({
        row: i + 1,
        email: row.email,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return result;
}
