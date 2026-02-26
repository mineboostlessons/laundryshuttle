"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Scale } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  addOrderItem,
  removeOrderItem,
  updateOrderWeight,
} from "../../actions";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemType: string;
  serviceId: string | null;
  service?: { pricingType: string } | null;
}

interface ServiceInfo {
  id: string;
  name: string;
  category: string;
  pricingType: string;
  price: number;
}

interface OrderItemsEditorProps {
  orderId: string;
  items: OrderItem[];
  services: ServiceInfo[];
  totalWeightLbs: number | null;
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  discountAmount: number;
  tipAmount: number;
  totalAmount: number;
  editable: boolean;
  promoCode?: { code: string } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  wash_and_fold: "Wash & Fold",
  dry_cleaning: "Dry Cleaning",
  specialty: "Specialty",
};

export function OrderItemsEditor({
  orderId,
  items,
  services,
  totalWeightLbs,
  subtotal,
  taxAmount,
  deliveryFee,
  discountAmount,
  tipAmount,
  totalAmount,
  editable,
  promoCode,
}: OrderItemsEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addQuantity, setAddQuantity] = useState("1");
  const [weightInput, setWeightInput] = useState(
    totalWeightLbs?.toString() ?? ""
  );
  const [editingWeight, setEditingWeight] = useState(false);

  function handleRemoveItem(itemId: string) {
    startTransition(async () => {
      await removeOrderItem({ orderId, itemId });
      router.refresh();
    });
  }

  function handleAddItem(serviceId: string) {
    const qty = parseFloat(addQuantity) || 1;
    startTransition(async () => {
      await addOrderItem({ orderId, serviceId, quantity: qty });
      setShowAddDialog(false);
      setAddQuantity("1");
      router.refresh();
    });
  }

  function handleUpdateWeight() {
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight < 0) return;
    startTransition(async () => {
      await updateOrderWeight({ orderId, totalWeightLbs: weight });
      setEditingWeight(false);
      router.refresh();
    });
  }

  // Group services by category for add dialog
  const grouped = services.reduce<Record<string, ServiceInfo[]>>((acc, svc) => {
    const cat = svc.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(svc);
    return acc;
  }, {});

  const hasPerPoundItems = items.some(
    (item) => item.service?.pricingType === "per_pound"
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Items & Pricing</CardTitle>
          {editable && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddDialog(true)}
              disabled={isPending}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Item
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="flex-1">
                  {item.name}{" "}
                  <span className="text-muted-foreground">
                    x{item.quantity}
                    {item.unitPrice > 0 && (
                      <> @ {formatCurrency(item.unitPrice)}</>
                    )}
                  </span>
                </span>
                <span className="font-medium mr-2">
                  {formatCurrency(item.totalPrice)}
                </span>
                {editable && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}

            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">No items</p>
            )}

            {/* Weight input for per-pound services */}
            {hasPerPoundItems && editable && (
              <div className="flex items-center gap-2 border-t pt-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                {editingWeight ? (
                  <>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      className="h-8 w-24"
                    />
                    <span className="text-sm text-muted-foreground">lbs</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={handleUpdateWeight}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => {
                        setEditingWeight(false);
                        setWeightInput(totalWeightLbs?.toString() ?? "");
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm">
                      Weight: {totalWeightLbs ?? "—"} lbs
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => setEditingWeight(true)}
                    >
                      Edit
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Totals */}
            <div className="border-t pt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>
                    Discount{promoCode ? ` (${promoCode.code})` : ""}
                  </span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tip</span>
                  <span>{formatCurrency(tipAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Service Item</DialogTitle>
          </DialogHeader>
          <div className="mb-3">
            <label className="text-sm font-medium">Quantity</label>
            <Input
              type="number"
              min="0.01"
              step="1"
              value={addQuantity}
              onChange={(e) => setAddQuantity(e.target.value)}
              className="mt-1 w-24"
            />
          </div>
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, svcs]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  {CATEGORY_LABELS[category] ?? category}
                </h4>
                <div className="space-y-1">
                  {svcs.map((svc) => (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => handleAddItem(svc.id)}
                      disabled={isPending}
                      className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      <span>{svc.name}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(svc.price)}
                        {svc.pricingType === "per_pound"
                          ? "/lb"
                          : svc.pricingType === "per_item"
                            ? "/ea"
                            : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {services.length === 0 && (
              <p className="text-sm text-muted-foreground">No services available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
