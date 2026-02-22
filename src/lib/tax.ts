import prisma from "./prisma";

// =============================================================================
// Tax Calculation Engine
// =============================================================================

export interface TaxConfig {
  taxMode: string; // "manual" | "stripe_tax"
  defaultTaxRate: number; // e.g. 0.08 for 8%
  taxRegistrations: TaxRegistration[] | null;
}

export interface TaxRegistration {
  state: string;
  rate: number;
  registrationNumber?: string;
}

export interface TaxableItem {
  amount: number;
  taxable: boolean;
}

export interface TaxBreakdown {
  subtotal: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

/**
 * Load tax configuration for a tenant.
 */
export async function getTenantTaxConfig(
  tenantId: string
): Promise<TaxConfig> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      taxMode: true,
      defaultTaxRate: true,
      taxRegistrations: true,
    },
  });

  if (!tenant) {
    return { taxMode: "manual", defaultTaxRate: 0, taxRegistrations: null };
  }

  return {
    taxMode: tenant.taxMode,
    defaultTaxRate: tenant.defaultTaxRate,
    taxRegistrations: tenant.taxRegistrations as TaxRegistration[] | null,
  };
}

/**
 * Get the applicable tax rate for a given state.
 * Falls back to the tenant's default rate if no state-specific rate is found.
 */
export function getApplicableTaxRate(
  config: TaxConfig,
  state?: string
): number {
  if (config.taxMode !== "manual") {
    // For Stripe Tax mode, rate is computed at charge time
    return config.defaultTaxRate;
  }

  if (state && config.taxRegistrations) {
    const registration = config.taxRegistrations.find(
      (r) => r.state.toLowerCase() === state.toLowerCase()
    );
    if (registration) {
      return registration.rate;
    }
  }

  return config.defaultTaxRate;
}

/**
 * Calculate tax for a list of items.
 * Only items marked as taxable are included in the tax calculation.
 */
export function calculateTax(
  items: TaxableItem[],
  taxRate: number
): TaxBreakdown {
  let subtotal = 0;
  let taxableAmount = 0;

  for (const item of items) {
    subtotal += item.amount;
    if (item.taxable) {
      taxableAmount += item.amount;
    }
  }

  const taxAmount = roundCurrency(taxableAmount * taxRate);
  const total = roundCurrency(subtotal + taxAmount);

  return {
    subtotal: roundCurrency(subtotal),
    taxableAmount: roundCurrency(taxableAmount),
    taxRate,
    taxAmount,
    total,
  };
}

/**
 * Calculate tax for a simple amount (e.g., POS total).
 */
export function calculateSimpleTax(
  subtotal: number,
  taxableAmount: number,
  taxRate: number
): { taxAmount: number; total: number } {
  const taxAmount = roundCurrency(taxableAmount * taxRate);
  const total = roundCurrency(subtotal + taxAmount);
  return { taxAmount, total };
}

/**
 * Format a tax breakdown for display on receipts.
 */
export function formatTaxBreakdown(breakdown: TaxBreakdown): string[] {
  const lines: string[] = [];
  lines.push(`Subtotal: $${breakdown.subtotal.toFixed(2)}`);

  if (breakdown.taxAmount > 0) {
    const ratePercent = (breakdown.taxRate * 100).toFixed(2);
    lines.push(`Tax (${ratePercent}%): $${breakdown.taxAmount.toFixed(2)}`);
  }

  lines.push(`Total: $${breakdown.total.toFixed(2)}`);
  return lines;
}

/**
 * Round to 2 decimal places (currency precision).
 */
function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}
