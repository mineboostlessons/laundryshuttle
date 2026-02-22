"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTenant, type AdminActionState } from "../../actions";

interface TenantData {
  id: string;
  businessName: string;
  businessType: string;
  phone: string | null;
  email: string | null;
  customDomain: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  platformFeePercent: number;
  themePreset: string;
  isActive: boolean;
}

const initialState: AdminActionState = {};

export function TenantEditForm({ tenant }: { tenant: TenantData }) {
  const [state, formAction, isPending] = useActionState(updateTenant, initialState);

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold">Edit Tenant</h3>

      {state.error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          {state.message}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={tenant.id} />
        <input type="hidden" name="isActive" value={String(tenant.isActive)} />

        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            name="businessName"
            defaultValue={tenant.businessName}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="businessType">Business Type</Label>
            <Select name="businessType" defaultValue={tenant.businessType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="laundromat">Laundromat</SelectItem>
                <SelectItem value="dry_cleaner">Dry Cleaner</SelectItem>
                <SelectItem value="wash_and_fold">Wash & Fold</SelectItem>
                <SelectItem value="combo">Combo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="themePreset">Theme</Label>
            <Select name="themePreset" defaultValue={tenant.themePreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={tenant.phone || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={tenant.email || ""}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customDomain">Custom Domain</Label>
          <Input
            id="customDomain"
            name="customDomain"
            type="text"
            placeholder="www.example.com"
            defaultValue={tenant.customDomain || ""}
          />
          <p className="text-xs text-muted-foreground">
            Override custom domain directly (bypasses DNS verification)
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="subscriptionPlan">Plan</Label>
            <Select name="subscriptionPlan" defaultValue={tenant.subscriptionPlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard ($99/mo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subscriptionStatus">Subscription Status</Label>
            <Select name="subscriptionStatus" defaultValue={tenant.subscriptionStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="platformFeePercent">Platform Fee (%)</Label>
          <Input
            id="platformFeePercent"
            name="platformFeePercent"
            type="number"
            step="0.001"
            min="0"
            max="1"
            defaultValue={tenant.platformFeePercent}
          />
          <p className="text-xs text-muted-foreground">
            Enter as decimal (e.g., 0.01 = 1%)
          </p>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
