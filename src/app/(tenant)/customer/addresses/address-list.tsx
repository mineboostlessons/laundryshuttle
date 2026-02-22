"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  X,
} from "lucide-react";
import {
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../actions";

interface Address {
  id: string;
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
  pickupNotes: string | null;
  createdAt: Date;
}

interface AddressFormData {
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  pickupNotes: string;
  isDefault: boolean;
}

const EMPTY_FORM: AddressFormData = {
  label: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  pickupNotes: "",
  isDefault: false,
};

export function AddressList({
  initialAddresses,
}: {
  initialAddresses: Address[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormData>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

  function openEdit(address: Address) {
    setEditingId(address.id);
    setForm({
      label: address.label ?? "",
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? "",
      city: address.city,
      state: address.state,
      zip: address.zip,
      pickupNotes: address.pickupNotes ?? "",
      isDefault: address.isDefault,
    });
    setError(null);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (editingId) {
          await updateAddress(editingId, form);
        } else {
          await createAddress(form);
        }
        setShowForm(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleDelete(addressId: string) {
    if (!confirm("Remove this address?")) return;
    startTransition(async () => {
      try {
        await deleteAddress(addressId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleSetDefault(addressId: string) {
    startTransition(async () => {
      try {
        await setDefaultAddress(addressId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Address
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {editingId ? "Edit Address" : "New Address"}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {error && (
              <p className="text-sm text-destructive mb-4">{error}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    placeholder="Home, Work, etc."
                    value={form.label}
                    onChange={(e) =>
                      setForm({ ...form, label: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="addressLine1">Street Address</Label>
                  <Input
                    id="addressLine1"
                    placeholder="123 Main St"
                    value={form.addressLine1}
                    onChange={(e) =>
                      setForm({ ...form, addressLine1: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="addressLine2">Apt / Suite (optional)</Label>
                  <Input
                    id="addressLine2"
                    placeholder="Apt 4B"
                    value={form.addressLine2}
                    onChange={(e) =>
                      setForm({ ...form, addressLine2: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) =>
                      setForm({ ...form, city: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="NY"
                    value={form.state}
                    onChange={(e) =>
                      setForm({ ...form, state: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    placeholder="10001"
                    value={form.zip}
                    onChange={(e) =>
                      setForm({ ...form, zip: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pickupNotes">Pickup Notes (optional)</Label>
                <Textarea
                  id="pickupNotes"
                  placeholder="Gate code, building instructions, etc."
                  value={form.pickupNotes}
                  onChange={(e) =>
                    setForm({ ...form, pickupNotes: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) =>
                    setForm({ ...form, isDefault: e.target.checked })
                  }
                  className="rounded border-input"
                />
                <Label htmlFor="isDefault" className="font-normal">
                  Set as default address
                </Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending
                    ? "Saving..."
                    : editingId
                      ? "Update Address"
                      : "Add Address"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Address Cards */}
      {initialAddresses.map((address) => (
        <Card key={address.id}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{address.label ?? "Address"}</p>
                    {address.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {address.addressLine1}
                    {address.addressLine2 && `, ${address.addressLine2}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {address.city}, {address.state} {address.zip}
                  </p>
                  {address.pickupNotes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {address.pickupNotes}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!address.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Set as default"
                    onClick={() => handleSetDefault(address.id)}
                    disabled={isPending}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  title="Edit"
                  onClick={() => openEdit(address)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  onClick={() => handleDelete(address.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
