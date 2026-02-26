"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { EquipmentTilePicker } from "./equipment-tile-picker";
import { OrderItemsEditor } from "./order-items-editor";
import {
  startProcessingOrder,
  updateEquipmentAssignment,
  markOrderReadyAndCharge,
} from "../../actions";
import { updateOrderStatus } from "@/app/(tenant)/dashboard/orders/actions";

const PREF_LABELS: Record<string, string> = {
  regular: "Regular",
  hypoallergenic: "Hypoallergenic",
  fragrance_free: "Fragrance Free",
  eco_friendly: "Eco-Friendly",
  cold: "Cold",
  warm: "Warm",
  hot: "Hot",
  low: "Low",
  medium: "Medium",
  high: "High",
  hang_dry: "Hang Dry",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  picked_up: "default",
  processing: "default",
  ready: "default",
  out_for_delivery: "default",
  delivered: "default",
  completed: "default",
  cancelled: "destructive",
};

interface AttendantOrderDetailViewProps {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    orderType: string;
    subtotal: number;
    taxAmount: number;
    deliveryFee: number;
    discountAmount: number;
    tipAmount: number;
    totalAmount: number;
    totalWeightLbs: number | null;
    numBags: number | null;
    binNumber: string | null;
    washerNumber: number | null;
    dryerNumber: number | null;
    paymentMethod: string | null;
    paidAt: Date | null;
    createdAt: Date;
    pickupDate: Date | null;
    pickupTimeSlot: string | null;
    deliveryDate: Date | null;
    deliveryTimeSlot: string | null;
    pickupNotes: string | null;
    specialInstructions: string | null;
    preferencesSnapshot: unknown;
    customer: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      phone: string | null;
      walletBalance: number;
    } | null;
    pickupAddress: {
      addressLine1: string;
      addressLine2: string | null;
      city: string;
      state: string;
      zip: string;
      pickupNotes: string | null;
    } | null;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      itemType: string;
      serviceId: string | null;
      service?: { pricingType: string } | null;
    }>;
    statusHistory: Array<{
      id: string;
      status: string;
      notes: string | null;
      createdAt: Date;
    }>;
    promoCode: {
      code: string;
      discountType: string;
      discountValue: number;
    } | null;
  };
  equipment: {
    totalWashers: number;
    totalDryers: number;
    washersInUse: number[];
    dryersInUse: number[];
  };
  services: Array<{
    id: string;
    name: string;
    category: string;
    pricingType: string;
    price: number;
  }>;
}

export function AttendantOrderDetailView({
  order,
  equipment,
  services,
}: AttendantOrderDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Equipment picker state
  const [showWasherPicker, setShowWasherPicker] = useState(false);
  const [showDryerPicker, setShowDryerPicker] = useState(false);
  const [selectedWasher, setSelectedWasher] = useState<number | null>(
    order.washerNumber
  );
  const [selectedDryer, setSelectedDryer] = useState<number | null>(
    order.dryerNumber
  );

  const isEditable = ["confirmed", "picked_up", "processing"].includes(
    order.status
  );

  // Status-specific action handlers
  function handleStartProcessing() {
    if (!selectedWasher && showWasherPicker) return;
    setError(null);
    startTransition(async () => {
      const result = await startProcessingOrder({
        orderId: order.id,
        washerNumber: selectedWasher ?? undefined,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to start processing");
      } else {
        router.refresh();
      }
    });
  }

  function handleAssignWasher(num: number) {
    setSelectedWasher(num);
    setError(null);
    startTransition(async () => {
      const result = await updateEquipmentAssignment({
        orderId: order.id,
        washerNumber: num,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to assign washer");
      } else {
        setShowWasherPicker(false);
        router.refresh();
      }
    });
  }

  function handleMoveToDryer(num: number) {
    setSelectedDryer(num);
    setError(null);
    startTransition(async () => {
      const result = await updateEquipmentAssignment({
        orderId: order.id,
        washerNumber: undefined,
        dryerNumber: num,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to assign dryer");
      } else {
        setShowDryerPicker(false);
        router.refresh();
      }
    });
  }

  function handleMarkReady() {
    setError(null);
    startTransition(async () => {
      const result = await markOrderReadyAndCharge(order.id);
      if (!result.success) {
        setError(result.error ?? "Failed to mark ready");
      } else {
        router.refresh();
      }
    });
  }

  function handleStatusUpdate(newStatus: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateOrderStatus({
        orderId: order.id,
        status: newStatus as "pending" | "confirmed" | "picked_up" | "processing" | "ready" | "out_for_delivery" | "delivered" | "completed" | "cancelled",
      });
      if (!result.success) {
        setError(result.error ?? "Failed to update status");
      } else {
        router.refresh();
      }
    });
  }

  // Determine what actions to show
  function renderActionButtons() {
    const status = order.status;

    if (status === "confirmed" || status === "picked_up") {
      if (showWasherPicker) {
        return (
          <div className="space-y-3">
            <EquipmentTilePicker
              type="washer"
              total={equipment.totalWashers}
              inUse={equipment.washersInUse}
              selected={selectedWasher}
              onSelect={(num) => {
                setSelectedWasher(num);
              }}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleStartProcessing}
                disabled={isPending || !selectedWasher}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Start Processing with Washer #{selectedWasher}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowWasherPicker(false);
                  setSelectedWasher(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (equipment.totalWashers > 0) {
                setShowWasherPicker(true);
              } else {
                handleStartProcessing();
              }
            }}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Start Processing
          </Button>
        </div>
      );
    }

    if (status === "processing") {
      // Show dryer picker if requested
      if (showDryerPicker) {
        return (
          <div className="space-y-3">
            <EquipmentTilePicker
              type="dryer"
              total={equipment.totalDryers}
              inUse={equipment.dryersInUse}
              selected={selectedDryer}
              onSelect={handleMoveToDryer}
            />
            <Button
              variant="ghost"
              onClick={() => {
                setShowDryerPicker(false);
                setSelectedDryer(null);
              }}
            >
              Cancel
            </Button>
          </div>
        );
      }

      // Show washer picker if requested
      if (showWasherPicker) {
        return (
          <div className="space-y-3">
            <EquipmentTilePicker
              type="washer"
              total={equipment.totalWashers}
              inUse={equipment.washersInUse}
              selected={selectedWasher}
              onSelect={handleAssignWasher}
            />
            <Button
              variant="ghost"
              onClick={() => {
                setShowWasherPicker(false);
                setSelectedWasher(null);
              }}
            >
              Cancel
            </Button>
          </div>
        );
      }

      return (
        <div className="flex flex-wrap gap-2">
          {order.washerNumber && !order.dryerNumber && equipment.totalDryers > 0 && (
            <Button
              onClick={() => setShowDryerPicker(true)}
              disabled={isPending}
            >
              Move to Dryer
            </Button>
          )}
          {!order.washerNumber && equipment.totalWashers > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowWasherPicker(true)}
              disabled={isPending}
            >
              Assign Washer
            </Button>
          )}
          <Button
            onClick={handleMarkReady}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Mark Ready
          </Button>
        </div>
      );
    }

    if (status === "ready") {
      return (
        <div className="flex gap-2">
          {order.orderType === "delivery" && (
            <Button
              onClick={() => handleStatusUpdate("out_for_delivery")}
              disabled={isPending}
            >
              Out for Delivery
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => handleStatusUpdate("completed")}
            disabled={isPending}
          >
            Complete
          </Button>
        </div>
      );
    }

    if (status === "out_for_delivery") {
      return (
        <Button
          onClick={() => handleStatusUpdate("delivered")}
          disabled={isPending}
        >
          Mark Delivered
        </Button>
      );
    }

    if (status === "delivered") {
      return (
        <Button
          onClick={() => handleStatusUpdate("completed")}
          disabled={isPending}
        >
          Complete
        </Button>
      );
    }

    return null;
  }

  const prefs = order.preferencesSnapshot as {
    detergent?: string;
    waterTemp?: string;
    dryerTemp?: string;
    fabricSoftener?: boolean;
  } | null;

  return (
    <div className="space-y-6">
      {/* Status Action Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant={STATUS_COLORS[order.status] ?? "secondary"}
              className="text-sm px-3 py-1"
            >
              {order.status.replace(/_/g, " ").toUpperCase()}
            </Badge>

            {order.binNumber && (
              <span className="text-sm font-medium bg-muted px-2 py-1 rounded">
                Bin: {order.binNumber}
              </span>
            )}

            {/* Equipment banners */}
            {order.washerNumber && (
              <span className="text-sm font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-md">
                WASHING Washer #{order.washerNumber}
              </span>
            )}

            {order.dryerNumber && (
              <span className="text-sm font-medium bg-orange-100 text-orange-800 px-3 py-1 rounded-md">
                DRYING Dryer #{order.dryerNumber}
              </span>
            )}

            {order.paidAt && (
              <Badge variant="outline" className="text-green-700 border-green-300">
                Paid
              </Badge>
            )}

            {order.numBags && (
              <span className="text-xs text-muted-foreground">
                {order.numBags} bags
              </span>
            )}
            {order.totalWeightLbs && (
              <span className="text-xs text-muted-foreground">
                {order.totalWeightLbs} lbs
              </span>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {renderActionButtons()}
        </CardContent>
      </Card>

      {/* Items & Pricing */}
      <OrderItemsEditor
        orderId={order.id}
        items={order.items}
        services={services}
        totalWeightLbs={order.totalWeightLbs}
        subtotal={order.subtotal}
        taxAmount={order.taxAmount}
        deliveryFee={order.deliveryFee}
        discountAmount={order.discountAmount}
        tipAmount={order.tipAmount}
        totalAmount={order.totalAmount}
        editable={isEditable}
        promoCode={order.promoCode}
      />

      {/* Customer Info & Schedule */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {order.customer ? (
              <>
                <p className="font-medium">
                  {order.customer.firstName} {order.customer.lastName}
                </p>
                <p className="text-muted-foreground">{order.customer.email}</p>
                {order.customer.phone && (
                  <p className="text-muted-foreground">{order.customer.phone}</p>
                )}
                <p className="text-muted-foreground">
                  Wallet: {formatCurrency(order.customer.walletBalance)}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Walk-in / Guest</p>
            )}
          </CardContent>
        </Card>

        {(order.pickupDate || order.deliveryDate) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {order.pickupDate && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Pickup
                  </p>
                  <p className="font-medium">
                    {new Date(order.pickupDate).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  {order.pickupTimeSlot && (
                    <p className="text-muted-foreground">
                      {order.pickupTimeSlot}
                    </p>
                  )}
                </div>
              )}
              {order.deliveryDate && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Delivery
                  </p>
                  <p className="font-medium">
                    {new Date(order.deliveryDate).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  {order.deliveryTimeSlot && (
                    <p className="text-muted-foreground">
                      {order.deliveryTimeSlot}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Preferences */}
      {(prefs || order.specialInstructions) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {prefs && (
              <div className="flex flex-wrap gap-2">
                {prefs.detergent && (
                  <Badge variant="outline">
                    Detergent: {PREF_LABELS[prefs.detergent] ?? prefs.detergent}
                  </Badge>
                )}
                {prefs.waterTemp && (
                  <Badge variant="outline">
                    Water: {PREF_LABELS[prefs.waterTemp] ?? prefs.waterTemp}
                  </Badge>
                )}
                {prefs.dryerTemp && (
                  <Badge variant="outline">
                    Dryer: {PREF_LABELS[prefs.dryerTemp] ?? prefs.dryerTemp}
                  </Badge>
                )}
                {prefs.fabricSoftener && (
                  <Badge variant="outline">Fabric Softener</Badge>
                )}
              </div>
            )}
            {order.specialInstructions && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Special Instructions
                </p>
                <p className="mt-1">{order.specialInstructions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pickup Address */}
      {order.pickupAddress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pickup Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{order.pickupAddress.addressLine1}</p>
            {order.pickupAddress.addressLine2 && (
              <p>{order.pickupAddress.addressLine2}</p>
            )}
            <p>
              {order.pickupAddress.city}, {order.pickupAddress.state}{" "}
              {order.pickupAddress.zip}
            </p>
            {(order.pickupNotes || order.pickupAddress.pickupNotes) && (
              <p className="mt-2 text-muted-foreground">
                <span className="font-medium text-foreground">
                  Pickup Instructions:{" "}
                </span>
                {order.pickupNotes || order.pickupAddress.pickupNotes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status History (collapsible) */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowHistory(!showHistory)}
        >
          <CardTitle className="flex items-center justify-between text-base">
            <span>Status History ({order.statusHistory.length})</span>
            {showHistory ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CardTitle>
        </CardHeader>
        {showHistory && (
          <CardContent>
            <div className="space-y-3">
              {order.statusHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 text-sm"
                >
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium capitalize">
                      {entry.status.replace(/_/g, " ")}
                    </p>
                    {entry.notes && (
                      <p className="text-muted-foreground">{entry.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
