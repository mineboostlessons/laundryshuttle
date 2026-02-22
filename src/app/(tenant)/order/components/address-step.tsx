"use client";

import {
  AddressAutocomplete,
  type AddressValue,
} from "@/components/maps/address-autocomplete";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AddressStepProps {
  address: AddressValue | null;
  addressLine2: string;
  pickupNotes: string;
  areaError: string | null;
  onAddressChange: (address: AddressValue | null) => void;
  onAddressLine2Change: (value: string) => void;
  onPickupNotesChange: (value: string) => void;
}

export function AddressStep({
  address,
  addressLine2,
  pickupNotes,
  areaError,
  onAddressChange,
  onAddressLine2Change,
  onPickupNotesChange,
}: AddressStepProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Pickup Address</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Where should we pick up your laundry?
      </p>

      <div className="mt-6 space-y-4">
        <AddressAutocomplete
          value={address}
          onChange={onAddressChange}
          label="Street Address"
          placeholder="Start typing your address..."
          required
          error={areaError ?? undefined}
        />

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
