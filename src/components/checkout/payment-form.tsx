"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// =============================================================================
// Inner form (inside Elements provider)
// =============================================================================

interface CheckoutFormProps {
  orderId: string;
  returnUrl: string;
  amount: number;
  walletDeduction: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function CheckoutForm({
  orderId,
  returnUrl,
  amount,
  walletDeduction,
  onSuccess,
  onError,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Payment failed");
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {walletDeduction > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          <Wallet className="h-4 w-4" />
          {formatCurrency(walletDeduction)} applied from wallet
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-4">
        <span className="text-sm text-muted-foreground">Amount to charge</span>
        <span className="text-lg font-semibold">{formatCurrency(amount)}</span>
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || processing}
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay {formatCurrency(amount)}
          </>
        )}
      </Button>
    </form>
  );
}

// =============================================================================
// Wrapper with Elements provider
// =============================================================================

interface PaymentFormProps {
  clientSecret: string;
  orderId: string;
  amount: number;
  walletDeduction: number;
  returnUrl: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export function PaymentForm({
  clientSecret,
  orderId,
  amount,
  walletDeduction,
  returnUrl,
  onSuccess,
  onError,
}: PaymentFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#0f172a",
          },
        },
      }}
    >
      <CheckoutForm
        orderId={orderId}
        returnUrl={returnUrl}
        amount={amount}
        walletDeduction={walletDeduction}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
