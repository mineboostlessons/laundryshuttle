"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreditCard, Plus, Trash2, Loader2, Star } from "lucide-react";
import {
  Elements,
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { setDefaultPaymentMethod, deletePaymentMethod, addPaymentMethod } from "./actions";

function getStripePromise(connectedAccountId?: string) {
  return loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
    connectedAccountId ? { stripeAccount: connectedAccountId } : undefined
  );
}

interface PaymentMethod {
  id: string;
  stripePaymentMethodId: string;
  cardLastFour: string;
  cardBrand: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

function AddCardForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (submitError) {
      setError(submitError.message ?? "Failed to save card");
      setProcessing(false);
      return;
    }

    if (setupIntent?.payment_method) {
      const pmId = typeof setupIntent.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent.payment_method.id;
      const result = await addPaymentMethod(pmId);
      if (!result.success) {
        setError(result.error ?? "Failed to save card");
        setProcessing(false);
        return;
      }
    }

    setProcessing(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || processing}>
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Card"
          )}
        </Button>
      </div>
    </form>
  );
}

export function PaymentMethodsView({
  methods: initialMethods,
}: {
  methods: PaymentMethod[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const startAddCard = async () => {
    setLoadingSetup(true);
    setDialogOpen(true);
    setSetupError(null);

    try {
      const res = await fetch("/api/stripe/setup-intent", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setClientSecret(data.data.clientSecret);
        setConnectedAccountId(data.data.stripeConnectAccountId ?? null);
      } else {
        setSetupError(data.error ?? "Failed to initialize card form");
      }
    } catch {
      setSetupError("Something went wrong. Please try again.");
    } finally {
      setLoadingSetup(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    await setDefaultPaymentMethod(id);
    setSettingDefaultId(null);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deletePaymentMethod(id);
    setDeletingId(null);
    router.refresh();
  };

  const handleAddSuccess = () => {
    setDialogOpen(false);
    setClientSecret(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {initialMethods.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No payment methods saved. Add a card to speed up checkout.
            </p>
          </CardContent>
        </Card>
      ) : (
        initialMethods.map((method) => (
          <Card key={method.id}>
            <CardContent className="flex items-center gap-4 py-4">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {BRAND_LABELS[method.cardBrand] ?? method.cardBrand}
                  </span>
                  <span className="text-muted-foreground">
                    ending in {method.cardLastFour}
                  </span>
                  {method.isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <Star className="h-3 w-3" />
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Expires {String(method.expMonth).padStart(2, "0")}/{method.expYear}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!method.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(method.id)}
                    disabled={settingDefaultId === method.id}
                  >
                    {settingDefaultId === method.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Set Default"
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(method.id)}
                  disabled={deletingId === method.id}
                >
                  {deletingId === method.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setClientSecret(null);
          setConnectedAccountId(null);
          setSetupError(null);
        }
      }}>
        <DialogTrigger asChild>
          <Button onClick={startAddCard} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add New Card
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a New Card</DialogTitle>
          </DialogHeader>
          {loadingSetup && !clientSecret ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : setupError ? (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {setupError}
            </p>
          ) : clientSecret ? (
            <Elements
              stripe={getStripePromise(connectedAccountId ?? undefined)}
              options={{
                clientSecret,
                appearance: { theme: "stripe" },
              }}
            >
              <AddCardForm
                onSuccess={handleAddSuccess}
                onCancel={() => {
                  setDialogOpen(false);
                  setClientSecret(null);
                  setConnectedAccountId(null);
                }}
              />
            </Elements>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
