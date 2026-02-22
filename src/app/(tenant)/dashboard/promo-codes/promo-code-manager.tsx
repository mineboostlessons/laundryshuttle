"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Tag } from "lucide-react";
import { createPromoCode, deactivatePromoCode } from "./actions";
import { formatCurrency } from "@/lib/utils";

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  currentUses: number;
  validFrom: Date;
  validUntil: Date | null;
  isActive: boolean;
  campaignType: string | null;
  createdAt: Date;
}

interface PromoCodeManagerProps {
  initialCodes: PromoCode[];
}

export function PromoCodeManager({ initialCodes }: PromoCodeManagerProps) {
  const [codes, setCodes] = useState(initialCodes);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    minOrderAmount: "",
    maxUses: "",
    maxUsesPerCustomer: "1",
    validFrom: new Date().toISOString().split("T")[0],
    validUntil: "",
  });

  const handleCreate = async () => {
    setCreating(true);
    setError(null);

    const result = await createPromoCode({
      code: form.code,
      description: form.description || undefined,
      discountType: form.discountType as "percentage" | "flat_amount" | "free_delivery",
      discountValue: parseFloat(form.discountValue) || 0,
      minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : undefined,
      maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
      maxUsesPerCustomer: parseInt(form.maxUsesPerCustomer) || 1,
      validFrom: form.validFrom,
      validUntil: form.validUntil || undefined,
    });

    if (result.success) {
      setShowCreate(false);
      setForm({
        code: "",
        description: "",
        discountType: "percentage",
        discountValue: "",
        minOrderAmount: "",
        maxUses: "",
        maxUsesPerCustomer: "1",
        validFrom: new Date().toISOString().split("T")[0],
        validUntil: "",
      });
      // Reload page to get fresh data
      window.location.reload();
    } else {
      setError(result.error ?? "Failed to create promo code");
    }

    setCreating(false);
  };

  const handleDeactivate = async (id: string) => {
    const result = await deactivatePromoCode(id);
    if (result.success) {
      setCodes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: false } : c))
      );
    }
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === "percentage") return `${value}% off`;
    if (type === "flat_amount") return `${formatCurrency(value)} off`;
    return "Free delivery";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {codes.length} promo code{codes.length !== 1 ? "s" : ""}
        </p>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Promo Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Promo Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  placeholder="e.g. SUMMER20"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                />
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="e.g. Summer promotion"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Discount Type</Label>
                  <Select
                    value={form.discountType}
                    onValueChange={(v) =>
                      setForm({ ...form, discountType: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="flat_amount">Flat Amount</SelectItem>
                      <SelectItem value="free_delivery">Free Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="discountValue">
                    {form.discountType === "percentage" ? "Percent (%)" : "Amount ($)"}
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min="0"
                    step={form.discountType === "percentage" ? "1" : "0.01"}
                    value={form.discountValue}
                    onChange={(e) =>
                      setForm({ ...form, discountValue: e.target.value })
                    }
                    disabled={form.discountType === "free_delivery"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="minOrder">Min Order ($)</Label>
                  <Input
                    id="minOrder"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="No minimum"
                    value={form.minOrderAmount}
                    onChange={(e) =>
                      setForm({ ...form, minOrderAmount: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="maxUses">Max Uses</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={form.maxUses}
                    onChange={(e) =>
                      setForm({ ...form, maxUses: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="validFrom">Valid From</Label>
                  <Input
                    id="validFrom"
                    type="date"
                    value={form.validFrom}
                    onChange={(e) =>
                      setForm({ ...form, validFrom: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="validUntil">Valid Until</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    placeholder="No end date"
                    value={form.validUntil}
                    onChange={(e) =>
                      setForm({ ...form, validUntil: e.target.value })
                    }
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={creating || !form.code}
              >
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Promo Code List */}
      <div className="space-y-3">
        {codes.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Tag className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No promo codes yet. Create your first one above.
              </p>
            </CardContent>
          </Card>
        )}

        {codes.map((code) => (
          <Card key={code.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold">{code.code}</span>
                  <Badge variant={code.isActive ? "default" : "secondary"}>
                    {code.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {code.campaignType && (
                    <Badge variant="outline">{code.campaignType}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDiscount(code.discountType, code.discountValue)}
                  {code.minOrderAmount
                    ? ` (min ${formatCurrency(code.minOrderAmount)})`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Used {code.currentUses}
                  {code.maxUses ? `/${code.maxUses}` : ""} times
                  {code.validUntil
                    ? ` · Expires ${new Date(code.validUntil).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              {code.isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeactivate(code.id)}
                >
                  Deactivate
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
