"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentForm } from "@/components/checkout/payment-form";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Tag } from "lucide-react";
import type { OrderFormData } from "../order-flow";

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  pricingType: string;
}

interface PaymentStepProps {
  formData: OrderFormData;
  services: ServiceItem[];
  orderId: string | null;
  tenantSlug: string;
}

export function PaymentStep({
  formData,
  services,
  orderId,
  tenantSlug,
}: PaymentStepProps) {
  const [promoCode, setPromoCode] = useState("");
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoResult, setPromoResult] = useState<{
    valid: boolean;
    discount?: number;
    message?: string;
  } | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate subtotal
  const subtotal = formData.services.reduce((sum, s) => {
    const svc = services.find((sv) => sv.id === s.serviceId);
    return sum + (svc ? svc.price * s.quantity : 0);
  }, 0);

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoValidating(true);
    setPromoResult(null);

    try {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, subtotal }),
      });
      const data = await res.json();
      setPromoResult(data.data);
    } catch {
      setPromoResult({ valid: false, message: "Failed to validate code" });
    } finally {
      setPromoValidating(false);
    }
  };

  const initPayment = async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          promoCode: promoResult?.valid ? promoCode.toUpperCase() : undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Failed to initialize payment");
        return;
      }

      setClientSecret(data.data.clientSecret);
      setPaymentAmount(data.data.amount);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-init payment when orderId is ready and no clientSecret yet
  useEffect(() => {
    if (orderId && !clientSecret) {
      initPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Payment</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Complete your payment to confirm the order.
      </p>

      <div className="mt-6 space-y-6">
        {/* Promo Code */}
        {!clientSecret && (
          <div>
            <Label htmlFor="promo-code">Promo Code</Label>
            <div className="mt-1 flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="promo-code"
                  placeholder="Enter code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={validatePromo}
                disabled={promoValidating || !promoCode.trim()}
              >
                {promoValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
            {promoResult && (
              <p
                className={`mt-2 text-sm ${
                  promoResult.valid ? "text-green-600" : "text-destructive"
                }`}
              >
                {promoResult.message}
                {promoResult.valid && promoResult.discount
                  ? ` (-${formatCurrency(promoResult.discount)})`
                  : ""}
              </p>
            )}
          </div>
        )}

        {/* Initialize Payment Button (if not yet initialized) */}
        {!clientSecret && !loading && orderId && (
          <Button onClick={initPayment} className="w-full" size="lg">
            Proceed to Payment
          </Button>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Setting up payment...
            </span>
          </div>
        )}

        {error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Stripe Payment Form */}
        {clientSecret && (
          <PaymentForm
            clientSecret={clientSecret}
            orderId={orderId!}
            amount={paymentAmount}
            returnUrl={`${window.location.origin}/customer?payment=success`}
            onSuccess={() => {
              window.location.href = "/customer?payment=success";
            }}
            onError={(msg) => setError(msg)}
          />
        )}
      </div>
    </div>
  );
}
