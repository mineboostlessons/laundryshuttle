// =============================================================================
// FIELD DEFINITIONS (for column mapping UI)
// =============================================================================

export const IMPORT_FIELD_DEFINITIONS = {
  import_customers: {
    required: ["email"],
    optional: ["firstName", "lastName", "phone", "addressLine1", "city", "state", "zip", "notes"],
    description: "Import customer accounts with optional addresses",
  },
  import_orders: {
    required: ["customerEmail", "status", "totalAmount"],
    optional: ["orderNumber", "orderType", "subtotal", "taxAmount", "deliveryFee", "createdAt", "pickupDate", "deliveryDate", "notes"],
    description: "Import historical orders linked to existing customers",
  },
  import_services: {
    required: ["name", "category", "pricingType", "price"],
    optional: ["description", "icon", "sortOrder", "taxable"],
    description: "Import service catalog items",
  },
  import_promo_codes: {
    required: ["code", "discountType", "discountValue"],
    optional: ["description", "minOrderAmount", "maxUses", "validFrom", "validUntil"],
    description: "Import promotional codes",
  },
} as const;

export type ImportOperationType = keyof typeof IMPORT_FIELD_DEFINITIONS;
