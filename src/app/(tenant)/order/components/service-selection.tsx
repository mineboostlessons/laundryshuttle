"use client";

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
  per_pound: "/lb",
  per_bag: "/bag",
  per_item: "/item",
  flat_rate: " flat",
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
  const selectedId = selected[0]?.serviceId ?? null;

  const handleSelect = (serviceId: string) => {
    if (selectedId === serviceId) {
      // Deselect
      onChange([]);
    } else {
      // Single-select with quantity 1
      onChange([{ serviceId, quantity: 1 }]);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">
        Select Service
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose your pickup frequency.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-6">
        {services.map((service) => {
          const isSelected = selectedId === service.id;

          return (
            <button
              key={service.id}
              type="button"
              onClick={() => handleSelect(service.id)}
              className={`flex h-36 w-36 flex-col items-center justify-center rounded-full border-2 transition-all ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-lg scale-105"
                  : "border-border bg-background text-foreground hover:border-primary/50 hover:shadow-md"
              }`}
            >
              <span className={`text-sm font-semibold text-center leading-tight px-3 ${
                isSelected ? "text-primary-foreground" : "text-foreground"
              }`}>
                {service.name}
              </span>
              <span className={`mt-2 text-lg font-bold ${
                isSelected ? "text-primary-foreground" : "text-primary"
              }`}>
                {formatCurrency(service.price)}
                <span className={`text-xs font-normal ${
                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                }`}>
                  {PRICING_LABELS[service.pricingType] ?? ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
