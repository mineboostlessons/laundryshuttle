"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, MapPin } from "lucide-react";
import { saveServiceAreaInterest } from "../actions";
import type { AddressValue } from "@/components/maps/address-autocomplete";

interface NotServiceableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: AddressValue | null;
}

export function NotServiceableDialog({
  open,
  onOpenChange,
  address,
}: NotServiceableDialogProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !address) return;

    setSubmitting(true);
    setError(null);

    const result = await saveServiceAreaInterest({
      email,
      addressLine1: address.addressLine1,
      city: address.city,
      state: address.state,
      zip: address.zip,
      lat: address.lat,
      lng: address.lng,
    });

    setSubmitting(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error ?? "Something went wrong");
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setEmail("");
      setSubmitted(false);
      setError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            Not in Our Service Area
          </DialogTitle>
          <DialogDescription>
            {address
              ? `We don't currently service ${address.city}, ${address.state}.`
              : "We don't currently service your area."}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
            <p className="mt-3 font-medium">Thanks for your interest!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll notify you at <strong>{email}</strong> when we expand to
              your area.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Leave your email and we&apos;ll notify you when we expand to your area.
            </p>
            <div>
              <Label htmlFor="interest-email">Email Address</Label>
              <Input
                id="interest-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !email.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Notify Me"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
