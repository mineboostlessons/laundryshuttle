"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Heart, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { submitTip } from "../../actions";

interface TipFormProps {
  orderId: string;
  subtotal: number;
  driverName?: string;
  hasTip: boolean;
  existingTipAmount?: number;
}

const TIP_PRESETS = [
  { label: "15%", multiplier: 0.15 },
  { label: "18%", multiplier: 0.18 },
  { label: "20%", multiplier: 0.2 },
  { label: "25%", multiplier: 0.25 },
];

export function TipForm({
  orderId,
  subtotal,
  driverName,
  hasTip,
  existingTipAmount,
}: TipFormProps) {
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const tipAmount =
    selectedPreset !== null
      ? Math.round(subtotal * TIP_PRESETS[selectedPreset].multiplier * 100) / 100
      : parseFloat(customAmount) || 0;

  const handleSelectPreset = (index: number) => {
    setSelectedPreset(index);
    setCustomAmount("");
    setError("");
  };

  const handleCustomChange = (value: string) => {
    setCustomAmount(value);
    setSelectedPreset(null);
    setError("");
  };

  const handleSubmit = () => {
    if (tipAmount < 0.5) {
      setError("Minimum tip is $0.50");
      return;
    }
    if (tipAmount > 500) {
      setError("Maximum tip is $500");
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        await submitTip({ orderId, amount: tipAmount });
        setSubmitted(true);
        setTimeout(() => setOpen(false), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit tip");
      }
    });
  };

  if (hasTip) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="h-4 w-4 text-green-500" />
        <span>Tip of {formatCurrency(existingTipAmount ?? 0)} added</span>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <Heart className="h-4 w-4 mr-2" />
          Add a Tip
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-medium">Thank you for the tip!</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(tipAmount)}
              {driverName ? ` for ${driverName}` : ""}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add a Tip</DialogTitle>
              <DialogDescription>
                {driverName
                  ? `Show appreciation for ${driverName}'s service.`
                  : "Show appreciation for great service."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Preset buttons */}
              <div className="grid grid-cols-4 gap-2">
                {TIP_PRESETS.map((preset, index) => {
                  const amount = Math.round(subtotal * preset.multiplier * 100) / 100;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSelectPreset(index)}
                      className={`rounded-lg border p-3 text-center transition-colors ${
                        selectedPreset === index
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:border-primary/50"
                      }`}
                    >
                      <p className="font-semibold">{preset.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(amount)}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Custom amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.50"
                    max="500"
                    placeholder="0.00"
                    value={customAmount}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {tipAmount > 0 && (
                <p className="text-center text-lg font-semibold">
                  Tip: {formatCurrency(tipAmount)}
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={isPending || tipAmount < 0.5}
                >
                  {isPending ? "Processing..." : "Add Tip"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
