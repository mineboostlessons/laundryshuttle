"use client";

import { useState } from "react";
import {
  AddressAutocomplete,
  type AddressValue,
} from "@/components/maps/address-autocomplete";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import type { SavedAddress } from "../order-flow";

interface AddressStepProps {
  address: AddressValue | null;
  addressLine2: string;
  pickupNotes: string;
  areaError: string | null;
  savedAddresses: SavedAddress[];
  onAddressChange: (address: AddressValue | null) => void;
  onAddressLine2Change: (value: string) => void;
  onPickupNotesChange: (value: string) => void;
}

export function AddressStep({
  address,
  addressLine2,
  pickupNotes,
  areaError,
  savedAddresses,
  onAddressChange,
  onAddressLine2Change,
  onPickupNotesChange,
}: AddressStepProps) {
  const hasSaved = savedAddresses.length > 0;
  const [showManualEntry, setShowManualEntry] = useState(!hasSaved);

  const handleSelectSaved = (saved: SavedAddress) => {
    if (saved.lat == null || saved.lng == null) return;
    setShowManualEntry(false);
    onAddressChange({
      addressLine1: saved.addressLine1,
      city: saved.city,
      state: saved.state,
      zip: saved.zip,
      lat: saved.lat,
      lng: saved.lng,
      placeName: saved.addressLine1,
    });
    onAddressLine2Change(saved.addressLine2 ?? "");
    onPickupNotesChange(saved.pickupNotes ?? "");
  };

  const isSelected = (saved: SavedAddress) =>
    address?.addressLine1 === saved.addressLine1 &&
    address?.city === saved.city &&
    address?.zip === saved.zip &&
    !showManualEntry;

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Pickup Address</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Where should we pick up your laundry?
      </p>

      <div className="mt-6 space-y-4">
        {/* Saved address cards */}
        {hasSaved && (
          <div className="space-y-3">
            <Label>Your Saved Addresses</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {savedAddresses.map((saved) => (
                <button
                  key={saved.id}
                  type="button"
                  onClick={() => handleSelectSaved(saved)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${
                    isSelected(saved)
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {saved.label || "Address"}
                      </span>
                      {saved.isDefault && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {saved.addressLine1}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {saved.city}, {saved.state} {saved.zip}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {!showManualEntry && (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={() => {
                  setShowManualEntry(true);
                  onAddressChange(null);
                  onAddressLine2Change("");
                  onPickupNotesChange("");
                }}
              >
                Use a different address
              </Button>
            )}
          </div>
        )}

        {/* Mapbox autocomplete — shown for guests or when "Use a different address" is clicked */}
        {showManualEntry && (
          <>
            <AddressAutocomplete
              value={address}
              onChange={onAddressChange}
              label="Street Address"
              placeholder="Start typing your address..."
              required
              error={areaError ?? undefined}
            />
            {hasSaved && (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={() => {
                  setShowManualEntry(false);
                  // Re-select default or first saved address
                  const defaultAddr =
                    savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
                  if (defaultAddr) handleSelectSaved(defaultAddr);
                }}
              >
                Use a saved address instead
              </Button>
            )}
          </>
        )}

        {/* Area error for saved address selection */}
        {areaError && !showManualEntry && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {areaError}
          </p>
        )}

        <div>
          <Label htmlFor="addressLine2">Apt / Suite / Unit (optional)</Label>
          <Input
            id="addressLine2"
            value={addressLine2}
            onChange={(e) => onAddressLine2Change(e.target.value)}
            placeholder="Apt 4B"
            className="mt-2"
          />
        </div>

        {address && (
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium text-foreground">
              Confirmed Address
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {address.addressLine1}
              {addressLine2 ? `, ${addressLine2}` : ""}
              <br />
              {address.city}, {address.state} {address.zip}
            </p>
          </div>
        )}

        <div>
          <Label htmlFor="pickupNotes">
            Pickup Instructions (optional)
          </Label>
          <Textarea
            id="pickupNotes"
            value={pickupNotes}
            onChange={(e) => onPickupNotesChange(e.target.value)}
            placeholder="e.g., Leave bags on the front porch, ring doorbell..."
            className="mt-2"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
