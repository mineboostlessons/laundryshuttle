"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  pricingType: string;
  price: number;
  icon: string | null;
}

interface SelectedService {
  serviceId: string;
  quantity: number;
}

const PRICING_LABELS: Record<string, string> = {
  per_pound: "per lb",
  per_bag: "per bag",
  per_item: "per item",
  flat_rate: "flat rate",
};

const CATEGORY_LABELS: Record<string, string> = {
  wash_and_fold: "Wash & Fold",
  dry_cleaning: "Dry Cleaning",
  specialty: "Specialty",
};

interface ServiceSelectionProps {
  services: ServiceItem[];
  selected: SelectedService[];
  onChange: (selected: SelectedService[]) => void;
}

export function ServiceSelection({
  services,
  selected,
  onChange,
}: ServiceSelectionProps) {
  const getQuantity = (serviceId: string) =>
    selected.find((s) => s.serviceId === serviceId)?.quantity ?? 0;

  const setQuantity = (serviceId: string, quantity: number) => {
    if (quantity <= 0) {
      onChange(selected.filter((s) => s.serviceId !== serviceId));
    } else {
      const existing = selected.find((s) => s.serviceId === serviceId);
      if (existing) {
        onChange(
          selected.map((s) =>
            s.serviceId === serviceId ? { ...s, quantity } : s
          )
        );
      } else {
        onChange([...selected, { serviceId, quantity }]);
      }
    }
  };

  // Group by category
  const grouped = services.reduce(
    (acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    },
    {} as Record<string, ServiceItem[]>
  );

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">
        Select Services
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose the services you need. You can adjust quantities.
      </p>

      {Object.entries(grouped).map(([category, categoryServices]) => (
        <div key={category} className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABELS[category] ?? category}
          </h3>
          <div className="mt-3 space-y-3">
            {categoryServices.map((service) => {
              const qty = getQuantity(service.id);
              const isSelected = qty > 0;

              return (
                <div
                  key={service.id}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "hover:border-muted-foreground/40"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-foreground">
                        {service.name}
                      </h4>
                      <span className="text-sm font-semibold text-primary">
                        {formatCurrency(service.price)}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {PRICING_LABELS[service.pricingType] ?? ""}
                        </span>
                      </span>
                    </div>
                    {service.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {service.description}
                      </p>
                    )}
                  </div>

                  <div className="ml-4 flex items-center gap-2">
                    {isSelected ? (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setQuantity(service.id, qty - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {qty}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setQuantity(service.id, qty + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(service.id, 1)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {selected.length > 0 && (
        <div className="mt-6 rounded-lg bg-muted/50 p-4">
          <p className="text-sm font-medium text-foreground">
            {selected.length} service{selected.length !== 1 ? "s" : ""}{" "}
            selected — Estimated total:{" "}
            <span className="text-primary">
              {formatCurrency(
                selected.reduce((sum, s) => {
                  const svc = services.find((sv) => sv.id === s.serviceId);
                  return sum + (svc?.price ?? 0) * s.quantity;
                }, 0)
              )}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Final total may vary based on actual weight/count.
          </p>
        </div>
      )}
    </div>
  );
}
