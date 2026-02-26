"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete } from "@/components/maps/address-autocomplete";
import type { AddressValue } from "@/components/maps/address-autocomplete";
import { NotServiceableDialog } from "./not-serviceable-dialog";
import { checkServiceArea } from "../actions";
import { Loader2, MapPin } from "lucide-react";

export function HomepageAddressChecker() {
  const router = useRouter();
  const [address, setAddress] = useState<AddressValue | null>(null);
  const [checking, setChecking] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const handleCheck = async () => {
    if (!address) return;

    setChecking(true);
    const result = await checkServiceArea(address.lat, address.lng);
    setChecking(false);

    if (result.serviceable) {
      const params = new URLSearchParams({
        addressLine1: address.addressLine1,
        city: address.city,
        state: address.state,
        zip: address.zip,
        lat: String(address.lat),
        lng: String(address.lng),
        placeName: address.placeName,
      });
      router.push(`/order?${params.toString()}`);
    } else {
      setShowDialog(true);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="rounded-xl border bg-card p-4 shadow-lg">
        <AddressAutocomplete
          value={address}
          onChange={setAddress}
          label="Enter your address"
          placeholder="123 Main St, City, State"
        />
        <Button
          onClick={handleCheck}
          disabled={!address || checking}
          className="mt-3 w-full"
          size="lg"
        >
          {checking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Check Availability
            </>
          )}
        </Button>
      </div>

      <NotServiceableDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        address={address}
      />
    </div>
  );
}
