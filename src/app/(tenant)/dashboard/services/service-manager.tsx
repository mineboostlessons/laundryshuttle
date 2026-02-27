"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, WashingMachine, Pencil } from "lucide-react";
import { createService, updateService, deleteService } from "./actions";
import { formatCurrency } from "@/lib/utils";

interface Service {
  id: string;
  category: string;
  name: string;
  description: string | null;
  pricingType: string;
  price: number;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
  taxable: boolean;
  createdAt: Date;
}

interface ServiceManagerProps {
  initialServices: Service[];
}

const CATEGORIES = [
  { value: "wash_and_fold", label: "Wash & Fold" },
  { value: "dry_cleaning", label: "Dry Cleaning" },
  { value: "specialty", label: "Specialty" },
];

const PRICING_TYPES = [
  { value: "per_pound", label: "Per Pound" },
  { value: "per_bag", label: "Per Bag" },
  { value: "per_item", label: "Per Item" },
  { value: "flat_rate", label: "Flat Rate" },
];

const defaultForm = {
  category: "wash_and_fold",
  name: "",
  description: "",
  pricingType: "per_pound",
  price: "",
  icon: "",
  taxable: true,
};

function formatPricing(type: string, price: number) {
  const unit: Record<string, string> = {
    per_pound: "/lb",
    per_bag: "/bag",
    per_item: "/item",
    flat_rate: " flat",
  };
  return `${formatCurrency(price)}${unit[type] ?? ""}`;
}

function categoryLabel(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

export function ServiceManager({ initialServices }: ServiceManagerProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    const result = await createService({
      category: form.category as "wash_and_fold" | "dry_cleaning" | "specialty",
      name: form.name,
      description: form.description || undefined,
      pricingType: form.pricingType as "per_pound" | "per_bag" | "per_item" | "flat_rate",
      price: parseFloat(form.price) || 0,
      icon: form.icon || undefined,
      taxable: form.taxable,
    });

    if (result.success) {
      setShowCreate(false);
      setForm(defaultForm);
      router.refresh();
    } else {
      setError(result.error ?? "Failed to create service");
    }

    setLoading(false);
  };

  const openEdit = (service: Service) => {
    setForm({
      category: service.category,
      name: service.name,
      description: service.description ?? "",
      pricingType: service.pricingType,
      price: String(service.price),
      icon: service.icon ?? "",
      taxable: service.taxable,
    });
    setError(null);
    setEditingId(service.id);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setLoading(true);
    setError(null);

    const result = await updateService({
      id: editingId,
      category: form.category as "wash_and_fold" | "dry_cleaning" | "specialty",
      name: form.name,
      description: form.description || null,
      pricingType: form.pricingType as "per_pound" | "per_bag" | "per_item" | "flat_rate",
      price: parseFloat(form.price) || 0,
      icon: form.icon || null,
      taxable: form.taxable,
    });

    if (result.success) {
      setEditingId(null);
      setForm(defaultForm);
      router.refresh();
    } else {
      setError(result.error ?? "Failed to update service");
    }

    setLoading(false);
  };

  const handleToggleActive = async (service: Service) => {
    if (service.isActive) {
      await deleteService(service.id);
    } else {
      await updateService({ id: service.id, isActive: true });
    }
    router.refresh();
  };

  const serviceForm = (
    <div className="space-y-4">
      <div>
        <Label>Category</Label>
        <Select
          value={form.category}
          onValueChange={(v) => setForm({ ...form, category: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="svc-name">Name</Label>
        <Input
          id="svc-name"
          placeholder="e.g. Standard Wash & Fold"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="svc-desc">Description (optional)</Label>
        <Textarea
          id="svc-desc"
          placeholder="Brief description of the service"
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Pricing Type</Label>
          <Select
            value={form.pricingType}
            onValueChange={(v) => setForm({ ...form, pricingType: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRICING_TYPES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="svc-price">Price ($)</Label>
          <Input
            id="svc-price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="svc-taxable"
          checked={form.taxable}
          onCheckedChange={(v) => setForm({ ...form, taxable: v === true })}
        />
        <Label htmlFor="svc-taxable" className="font-normal">
          Taxable
        </Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {initialServices.length} service{initialServices.length !== 1 ? "s" : ""}
        </p>

        {/* Create dialog */}
        <Dialog
          open={showCreate}
          onOpenChange={(open) => {
            setShowCreate(open);
            if (!open) {
              setForm(defaultForm);
              setError(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Service</DialogTitle>
            </DialogHeader>
            {serviceForm}
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={loading || !form.name || !form.price}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Service
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingId(null);
            setForm(defaultForm);
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          {serviceForm}
          <Button
            className="w-full"
            onClick={handleUpdate}
            disabled={loading || !form.name || !form.price}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogContent>
      </Dialog>

      {/* Service list */}
      <div className="space-y-3">
        {initialServices.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <WashingMachine className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No services yet. Add your first service above.
              </p>
            </CardContent>
          </Card>
        )}

        {initialServices.map((service) => (
          <Card key={service.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{service.name}</span>
                  <Badge variant="outline">{categoryLabel(service.category)}</Badge>
                  <Badge variant={service.isActive ? "default" : "secondary"}>
                    {service.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {service.taxable && (
                    <Badge variant="outline" className="text-xs">
                      Taxable
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-primary">
                  {formatPricing(service.pricingType, service.price)}
                </p>
                {service.description && (
                  <p className="text-xs text-muted-foreground">
                    {service.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(service)}
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant={service.isActive ? "secondary" : "default"}
                  size="sm"
                  onClick={() => handleToggleActive(service)}
                >
                  {service.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
