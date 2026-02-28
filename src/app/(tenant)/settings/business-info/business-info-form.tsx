"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { AddressAutocomplete, type AddressValue } from "@/components/maps/address-autocomplete";
import { updateBusinessInfo, type UpdateBusinessInfoInput } from "./actions";

const BUSINESS_TYPES = [
  { value: "laundromat", label: "Laundromat" },
  { value: "dry_cleaner", label: "Dry Cleaner" },
  { value: "wash_and_fold", label: "Wash & Fold" },
  { value: "combo", label: "Combo" },
] as const;

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
] as const;

interface BusinessInfoFormProps {
  initialData: UpdateBusinessInfoInput;
}

export function BusinessInfoForm({ initialData }: BusinessInfoFormProps) {
  const [formData, setFormData] = useState<UpdateBusinessInfoInput>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const update = (partial: Partial<UpdateBusinessInfoInput>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const addressValue = useMemo<AddressValue | null>(() => {
    if (!formData.address) return null;
    return {
      addressLine1: formData.address,
      city: formData.city,
      state: formData.state,
      zip: formData.zip,
      lat: 0,
      lng: 0,
      placeName: "",
    };
  }, [formData.address, formData.city, formData.state, formData.zip]);

  const handleAddressChange = (addr: AddressValue | null) => {
    if (addr) {
      update({
        address: addr.addressLine1,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
      });
    } else {
      update({ address: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setResult(null);

    try {
      const res = await updateBusinessInfo(formData);
      setResult(res);
    } catch {
      setResult({ success: false, error: "Something went wrong. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business Details */}
      <Card>
        <CardHeader>
          <CardTitle>Business Details</CardTitle>
          <CardDescription>Your business name, type, and contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => update({ businessName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <select
                id="businessType"
                value={formData.businessType}
                onChange={(e) => update({ businessType: e.target.value as UpdateBusinessInfoInput["businessType"] })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Business Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone ?? ""}
                onChange={(e) => update({ phone: e.target.value })}
                placeholder="(555) 000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Business Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email ?? ""}
                onChange={(e) => update({ email: e.target.value })}
                placeholder="info@yourbusiness.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website ?? ""}
                onChange={(e) => update({ website: e.target.value })}
                placeholder="https://yourbusiness.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Location */}
      <Card>
        <CardHeader>
          <CardTitle>Primary Location</CardTitle>
          <CardDescription>Your main business address and location details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="locationName">Location Name</Label>
              <Input
                id="locationName"
                value={formData.locationName}
                onChange={(e) => update({ locationName: e.target.value })}
                required
                placeholder="Main Location"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => update({ timezone: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>
          <AddressAutocomplete
            value={addressValue}
            onChange={handleAddressChange}
            label="Street Address"
            placeholder="Start typing your address..."
            required
          />
          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              value={formData.addressLine2 ?? ""}
              onChange={(e) => update({ addressLine2: e.target.value })}
              placeholder="Suite, unit, floor, etc."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => update({ city: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => update({ state: e.target.value })}
                required
                maxLength={2}
                placeholder="NY"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={formData.zip}
                onChange={(e) => update({ zip: e.target.value })}
                required
                placeholder="10001"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="locationPhone">Location Phone</Label>
              <Input
                id="locationPhone"
                type="tel"
                value={formData.locationPhone ?? ""}
                onChange={(e) => update({ locationPhone: e.target.value })}
                placeholder="(555) 000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationEmail">Location Email</Label>
              <Input
                id="locationEmail"
                type="email"
                value={formData.locationEmail ?? ""}
                onChange={(e) => update({ locationEmail: e.target.value })}
                placeholder="location@yourbusiness.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status messages */}
      {result?.error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {result.error}
        </p>
      )}
      {result?.success && (
        <p className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
          Business info updated successfully.
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
