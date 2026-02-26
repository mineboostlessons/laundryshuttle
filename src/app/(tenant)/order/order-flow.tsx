"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { AddressValue } from "@/components/maps/address-autocomplete";
import type { TimeSlotData } from "./actions";
import { createOrder, validateServiceArea, getAvailableDates } from "./actions";
import { ServiceSelection } from "./components/service-selection";
import { AddressStep } from "./components/address-step";
import { ScheduleStep } from "./components/schedule-step";
import { PreferencesStep } from "./components/preferences-step";

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

export interface OrderFormData {
  services: SelectedService[];
  address: AddressValue | null;
  addressLine2: string;
  pickupNotes: string;
  pickupDate: string;
  pickupTimeSlot: string;
  deliveryDate: string;
  deliveryTimeSlot: string;
  specialInstructions: string;
  preferences: {
    detergent: string;
    waterTemp: string;
    fabricSoftener: boolean;
    dryerTemp: string;
  };
}

const STEPS = [
  { id: "address", label: "Address" },
  { id: "services", label: "Services" },
  { id: "schedule", label: "Schedule" },
  { id: "preferences", label: "Preferences" },
] as const;

export interface SavedAddress {
  id: string;
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
  pickupNotes: string | null;
}

export interface ReorderData {
  services: SelectedService[];
  address: AddressValue | null;
  addressLine2: string;
  pickupNotes: string;
  specialInstructions: string;
  preferences: OrderFormData["preferences"];
}

interface OrderFlowProps {
  services: ServiceItem[];
  timeSlots: TimeSlotData;
  tenantSlug: string;
  savedAddresses: SavedAddress[];
  reorderData?: ReorderData | null;
}

export function OrderFlow({ services, timeSlots, tenantSlug, savedAddresses, reorderData }: OrderFlowProps) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(reorderData ? 2 : 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    orderNumber?: string;
    orderId?: string;
    error?: string;
  } | null>(null);

  const [formData, setFormData] = useState<OrderFormData>(() => {
    // If reorder data is available, pre-populate from the previous order
    if (reorderData) {
      return {
        services: reorderData.services,
        address: reorderData.address,
        addressLine2: reorderData.addressLine2,
        pickupNotes: reorderData.pickupNotes,
        pickupDate: "",
        pickupTimeSlot: "",
        deliveryDate: "",
        deliveryTimeSlot: "",
        specialInstructions: reorderData.specialInstructions,
        preferences: reorderData.preferences,
      };
    }

    let initialAddress: AddressValue | null = null;
    let initialLine2 = "";
    let initialPickupNotes = "";
    const addressLine1 = searchParams.get("addressLine1");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (addressLine1 && lat && lng) {
      // Query params take priority
      initialAddress = {
        addressLine1,
        city: searchParams.get("city") ?? "",
        state: searchParams.get("state") ?? "",
        zip: searchParams.get("zip") ?? "",
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        placeName: searchParams.get("placeName") ?? addressLine1,
      };
    } else {
      // Pre-populate from default saved address
      const defaultAddr = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
      if (defaultAddr && defaultAddr.lat != null && defaultAddr.lng != null) {
        initialAddress = {
          addressLine1: defaultAddr.addressLine1,
          city: defaultAddr.city,
          state: defaultAddr.state,
          zip: defaultAddr.zip,
          lat: defaultAddr.lat,
          lng: defaultAddr.lng,
          placeName: defaultAddr.addressLine1,
        };
        initialLine2 = defaultAddr.addressLine2 ?? "";
        initialPickupNotes = defaultAddr.pickupNotes ?? "";
      }
    }

    return {
      services: [],
      address: initialAddress,
      addressLine2: initialLine2,
      pickupNotes: initialPickupNotes,
      pickupDate: "",
      pickupTimeSlot: "",
      deliveryDate: "",
      deliveryTimeSlot: "",
      specialInstructions: "",
      preferences: {
        detergent: "regular",
        waterTemp: "warm",
        fabricSoftener: false,
        dryerTemp: "medium",
      },
    };
  });

  const updateForm = (partial: Partial<OrderFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0: // Address
        return formData.address !== null && !areaError;
      case 1: // Services
        return formData.services.length > 0;
      case 2: // Schedule
        return (
          !!formData.pickupDate &&
          !!formData.pickupTimeSlot &&
          !!formData.deliveryDate &&
          !!formData.deliveryTimeSlot
        );
      case 3: // Preferences — optional, always can proceed
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    // After address step (step 0), validate service area
    if (step === 0 && formData.address) {
      setAreaError(null);
      const result = await validateServiceArea(
        formData.address.lat,
        formData.address.lng
      );
      if (!result.inArea) {
        setAreaError(
          "Sorry, your address is outside our service area. Please try a different address."
        );
        return;
      }
    }

    // At preferences step (step 3), create the order and show confirmation
    if (step === 3) {
      await handleCreateOrder();
      return;
    }

    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  };

  const handleCreateOrder = async () => {
    if (!formData.address) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const result = await createOrder({
        services: formData.services,
        address: {
          addressLine1: formData.address.addressLine1,
          addressLine2: formData.addressLine2 || undefined,
          city: formData.address.city,
          state: formData.address.state,
          zip: formData.address.zip,
          lat: formData.address.lat,
          lng: formData.address.lng,
          pickupNotes: formData.pickupNotes || undefined,
        },
        pickupDate: formData.pickupDate,
        pickupTimeSlot: formData.pickupTimeSlot,
        deliveryDate: formData.deliveryDate,
        deliveryTimeSlot: formData.deliveryTimeSlot,
        specialInstructions: formData.specialInstructions || undefined,
        preferences: formData.preferences,
      });

      if (result.success && result.orderId) {
        setSubmitResult(result);
        setOrderConfirmed(true);
      } else {
        setSubmitResult(result);
      }
    } catch {
      setSubmitResult({
        success: false,
        error: "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmation view after order is created
  if (orderConfirmed && submitResult?.success) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="mt-4 text-2xl font-bold">Pickup Scheduled!</h2>
        {submitResult.orderNumber && (
          <p className="mt-2 text-muted-foreground">
            Order #{submitResult.orderNumber}
          </p>
        )}
        <div className="mt-4 space-y-1 text-sm text-muted-foreground">
          <p>Pickup: {formData.pickupDate} &mdash; {formData.pickupTimeSlot}</p>
          <p>Delivery: {formData.deliveryDate} &mdash; {formData.deliveryTimeSlot}</p>
        </div>
        <p className="mt-6 text-muted-foreground">
          We&apos;ll see you then! Payment will be collected after your laundry is processed.
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
          <Link href="/customer">
            <Button>View My Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Step indicator */}
      <nav className="mb-8">
        <ol className="flex items-center">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                        ? "border-2 border-primary text-primary"
                        : "border-2 border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  {i < step ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`hidden text-sm font-medium sm:inline ${
                    i <= step ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-3 h-px w-8 sm:w-12 ${
                    i < step ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step content */}
      <div className="rounded-lg border bg-card p-6">
        {step === 0 && (
          <AddressStep
            address={formData.address}
            addressLine2={formData.addressLine2}
            pickupNotes={formData.pickupNotes}
            areaError={areaError}
            savedAddresses={savedAddresses}
            onAddressChange={(address) => {
              setAreaError(null);
              updateForm({ address });
            }}
            onAddressLine2Change={(addressLine2) =>
              updateForm({ addressLine2 })
            }
            onPickupNotesChange={(pickupNotes) =>
              updateForm({ pickupNotes })
            }
          />
        )}

        {step === 1 && (
          <ServiceSelection
            services={services}
            selected={formData.services}
            onChange={(selected) => updateForm({ services: selected })}
          />
        )}

        {step === 2 && (
          <ScheduleStep
            timeSlots={timeSlots}
            pickupDate={formData.pickupDate}
            pickupTimeSlot={formData.pickupTimeSlot}
            deliveryDate={formData.deliveryDate}
            deliveryTimeSlot={formData.deliveryTimeSlot}
            onChange={(partial) => updateForm(partial)}
          />
        )}

        {step === 3 && (
          <PreferencesStep
            preferences={formData.preferences}
            specialInstructions={formData.specialInstructions}
            onChange={(partial) => updateForm(partial)}
          />
        )}

        {/* Error message */}
        {submitResult?.error && (
          <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {submitResult.error}
          </p>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 0}
          className={step === 0 ? "invisible" : ""}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        {step < 3 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling Pickup...
              </>
            ) : (
              "Schedule Pickup"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
