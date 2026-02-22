"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentForm } from "@/components/checkout/payment-form";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Tag, Wallet, CheckCircle2 } from "lucide-react";
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
  walletBalance: number;
  tenantSlug: string;
}

export function PaymentStep({
  formData,
  services,
  orderId,
  walletBalance,
  tenantSlug,
}: PaymentStepProps) {
  const [promoCode, setPromoCode] = useState("");
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoResult, setPromoResult] = useState<{
    valid: boolean;
    discount?: number;
    message?: string;
  } | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [walletDeduction, setWalletDeduction] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paidWithWallet, setPaidWithWallet] = useState(false);

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
          useWallet,
          promoCode: promoResult?.valid ? promoCode.toUpperCase() : undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Failed to initialize payment");
        return;
      }

      if (data.data.paidWithWallet) {
        setPaidWithWallet(true);
        return;
      }

      setClientSecret(data.data.clientSecret);
      setPaymentAmount(data.data.amount);
      setWalletDeduction(data.data.walletDeduction);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-init payment when orderId is ready and no clientSecret yet
  useEffect(() => {
    if (orderId && !clientSecret && !paidWithWallet) {
      initPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (paidWithWallet) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <h3 className="mt-3 text-lg font-semibold">Paid with Wallet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Your wallet balance was used to pay for this order.
        </p>
      </div>
    );
  }

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

        {/* Wallet */}
        {walletBalance > 0 && !clientSecret && (
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 hover:bg-muted/50">
            <input
              type="checkbox"
              checked={useWallet}
              onChange={(e) => setUseWallet(e.target.checked)}
              className="h-4 w-4 rounded border-muted-foreground"
            />
            <Wallet className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Use Wallet Balance</p>
              <p className="text-xs text-muted-foreground">
                Available: {formatCurrency(walletBalance)}
              </p>
            </div>
          </label>
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
            walletDeduction={walletDeduction}
            returnUrl={`${window.location.origin}/customer?payment=success`}
            onSuccess={() => {
              // Will be handled by redirect or webhook
              window.location.href = "/customer?payment=success";
            }}
            onError={(msg) => setError(msg)}
          />
        )}
      </div>
    </div>
  );
}
