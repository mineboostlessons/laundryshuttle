"use client";

import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { OrderFormData } from "../order-flow";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  pricingType: string;
  price: number;
  icon: string | null;
}

const PRICING_LABELS: Record<string, string> = {
  per_pound: "/lb",
  per_bag: "/bag",
  per_item: "/item",
  flat_rate: "",
};

const PREF_LABELS: Record<string, string> = {
  regular: "Regular",
  hypoallergenic: "Hypoallergenic",
  fragrance_free: "Fragrance Free",
  eco_friendly: "Eco-Friendly",
  cold: "Cold",
  warm: "Warm",
  hot: "Hot",
  low: "Low",
  medium: "Medium",
  high: "High",
  hang_dry: "Hang Dry",
};

interface ReviewStepProps {
  formData: OrderFormData;
  services: ServiceItem[];
}

export function ReviewStep({ formData, services }: ReviewStepProps) {
  const selectedServices = formData.services
    .map((s) => {
      const svc = services.find((sv) => sv.id === s.serviceId);
      return svc ? { ...svc, quantity: s.quantity } : null;
    })
    .filter(Boolean) as (ServiceItem & { quantity: number })[];

  const subtotal = selectedServices.reduce(
    (sum, s) => sum + s.price * s.quantity,
    0
  );

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Review Order</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Please review your order details before placing it.
      </p>

      <div className="mt-6 space-y-6">
        {/* Services */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Services
          </h3>
          <div className="mt-2 space-y-2">
            {selectedServices.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-foreground">
                  {s.name} x{s.quantity}
                </span>
                <span className="font-medium text-foreground">
                  {formatCurrency(s.price * s.quantity)}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({formatCurrency(s.price)}
                    {PRICING_LABELS[s.pricingType] ?? ""} ea.)
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t pt-3">
            <div className="flex items-center justify-between font-medium">
              <span>Estimated Total</span>
              <span className="text-primary">{formatCurrency(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Final total may vary based on actual weight/count. Tax calculated
              at checkout.
            </p>
          </div>
        </div>

        {/* Address */}
        {formData.address && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Pickup Address
            </h3>
            <p className="mt-2 text-sm text-foreground">
              {formData.address.addressLine1}
              {formData.addressLine2 ? `, ${formData.addressLine2}` : ""}
              <br />
              {formData.address.city}, {formData.address.state}{" "}
              {formData.address.zip}
            </p>
            {formData.pickupNotes && (
              <p className="mt-1 text-sm text-muted-foreground">
                Notes: {formData.pickupNotes}
              </p>
            )}
          </div>
        )}

        {/* Schedule */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Schedule
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Pickup
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {formData.pickupDate
                  ? format(parseISO(formData.pickupDate), "EEE, MMM d, yyyy")
                  : "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {formData.pickupTimeSlot || "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Delivery
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {formData.deliveryDate
                  ? format(parseISO(formData.deliveryDate), "EEE, MMM d, yyyy")
                  : "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {formData.deliveryTimeSlot || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Preferences
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
              Detergent:{" "}
              {PREF_LABELS[formData.preferences.detergent] ??
                formData.preferences.detergent}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
              Water:{" "}
              {PREF_LABELS[formData.preferences.waterTemp] ??
                formData.preferences.waterTemp}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
              Dryer:{" "}
              {PREF_LABELS[formData.preferences.dryerTemp] ??
                formData.preferences.dryerTemp}
            </span>
            {formData.preferences.fabricSoftener && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                Fabric Softener
              </span>
            )}
          </div>
          {formData.specialInstructions && (
            <p className="mt-2 text-sm text-muted-foreground">
              Instructions: {formData.specialInstructions}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
