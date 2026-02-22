"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { AddressValue } from "@/components/maps/address-autocomplete";
import type { TimeSlotData } from "./actions";
import { createOrder, validateServiceArea, getAvailableDates } from "./actions";
import { ServiceSelection } from "./components/service-selection";
import { AddressStep } from "./components/address-step";
import { ScheduleStep } from "./components/schedule-step";
import { PreferencesStep } from "./components/preferences-step";
import { ReviewStep } from "./components/review-step";
import { PaymentStep } from "./components/payment-step";

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
  { id: "services", label: "Services" },
  { id: "address", label: "Address" },
  { id: "schedule", label: "Schedule" },
  { id: "preferences", label: "Preferences" },
  { id: "review", label: "Review" },
  { id: "payment", label: "Payment" },
] as const;

interface OrderFlowProps {
  services: ServiceItem[];
  timeSlots: TimeSlotData;
  tenantSlug: string;
  walletBalance?: number;
}

export function OrderFlow({ services, timeSlots, tenantSlug, walletBalance = 0 }: OrderFlowProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    orderNumber?: string;
    orderId?: string;
    error?: string;
  } | null>(null);

  const [formData, setFormData] = useState<OrderFormData>({
    services: [],
    address: null,
    addressLine2: "",
    pickupNotes: "",
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
  });

  const updateForm = (partial: Partial<OrderFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return formData.services.length > 0;
      case 1:
        return formData.address !== null && !areaError;
      case 2:
        return (
          !!formData.pickupDate &&
          !!formData.pickupTimeSlot &&
          !!formData.deliveryDate &&
          !!formData.deliveryTimeSlot
        );
      case 3:
        return true;
      case 4: // Review step — always can proceed to payment
        return true;
      case 5: // Payment step — handled by payment component
        return false;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    // After address step, validate service area
    if (step === 1 && formData.address) {
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

    // At review step, create the order before proceeding to payment
    if (step === 4 && !orderId) {
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
        setOrderId(result.orderId);
        setSubmitResult(result);
        setStep(5); // Go to payment step
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

  // Note: success/confirmation is now handled after payment on the customer page

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
          <ServiceSelection
            services={services}
            selected={formData.services}
            onChange={(selected) => updateForm({ services: selected })}
          />
        )}

        {step === 1 && (
          <AddressStep
            address={formData.address}
            addressLine2={formData.addressLine2}
            pickupNotes={formData.pickupNotes}
            areaError={areaError}
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

        {step === 4 && (
          <ReviewStep
            formData={formData}
            services={services}
          />
        )}

        {step === 5 && (
          <PaymentStep
            formData={formData}
            services={services}
            orderId={orderId}
            walletBalance={walletBalance}
            tenantSlug={tenantSlug}
          />
        )}

        {/* Error message */}
        {submitResult?.error && step !== 5 && (
          <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {submitResult.error}
          </p>
        )}
      </div>

      {/* Navigation buttons — hidden on payment step (payment has its own buttons) */}
      {step < 5 && (
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

          {step < 4 ? (
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
                  Creating Order...
                </>
              ) : (
                "Proceed to Payment"
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
