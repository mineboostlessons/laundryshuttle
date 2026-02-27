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
import { Loader2, RotateCcw, ArrowRight } from "lucide-react";
import { processRefund, updateOrderStatus } from "../actions";
import { formatCurrency } from "@/lib/utils";

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

interface OrderDetailViewProps {
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
    paymentMethod: string | null;
    stripePaymentIntentId: string | null;
    paidAt: Date | null;
    createdAt: Date;
    pickupDate: Date | null;
    pickupTimeSlot: string | null;
    deliveryDate: Date | null;
    deliveryTimeSlot: string | null;
    pickupNotes: string | null;
    specialInstructions: string | null;
    preferencesSnapshot: Record<string, unknown> | null | undefined;
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
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  processing: "default",
  ready: "default",
  out_for_delivery: "default",
  delivered: "default",
  completed: "default",
  cancelled: "destructive",
  refunded: "destructive",
  partially_refunded: "outline",
};

export function OrderDetailView({ order }: OrderDetailViewProps) {
  const [showRefund, setShowRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState<string>("requested_by_customer");
  const [refundToWallet, setRefundToWallet] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [refundResult, setRefundResult] = useState<{
    success: boolean;
    error?: string;
    refundAmount?: number;
    refundType?: string;
  } | null>(null);

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [nextStatus, setNextStatus] = useState<string>("");

  const canRefund =
    order.paidAt && !["refunded", "cancelled"].includes(order.status);

  const STATUS_FLOW: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["picked_up", "processing", "cancelled"],
    picked_up: ["processing", "cancelled"],
    processing: ["ready", "cancelled"],
    ready: ["out_for_delivery", "completed", "cancelled"],
    out_for_delivery: ["delivered", "cancelled"],
    delivered: ["completed"],
  };

  const availableTransitions = STATUS_FLOW[order.status] ?? [];

  const handleStatusUpdate = async (newStatus: string) => {
    setStatusUpdating(true);
    const result = await updateOrderStatus({
      orderId: order.id,
      status: newStatus as "pending" | "confirmed" | "picked_up" | "processing" | "ready" | "out_for_delivery" | "delivered" | "completed" | "cancelled",
    });
    setStatusUpdating(false);
    if (result.success) {
      window.location.reload();
    }
  };

  const handleRefund = async (fullRefund: boolean) => {
    setProcessing(true);
    setRefundResult(null);

    const result = await processRefund({
      orderId: order.id,
      amount: fullRefund ? undefined : parseFloat(refundAmount),
      reason: refundReason as "duplicate" | "fraudulent" | "requested_by_customer",
      refundToWallet,
    });

    setRefundResult(result);
    setProcessing(false);

    if (result.success) {
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={STATUS_COLORS[order.status] ?? "secondary"}>
                {order.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>{order.orderType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span>{order.paymentMethod ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span>
                {order.paidAt
                  ? new Date(order.paidAt).toLocaleString()
                  : "Not paid"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(order.createdAt).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

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
              <p className="text-muted-foreground">Guest order</p>
            )}
          </CardContent>
        </Card>
      </div>

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
                <span className="font-medium text-foreground">Pickup Instructions: </span>
                {order.pickupNotes || order.pickupAddress.pickupNotes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedule & Preferences */}
      <div className="grid gap-6 md:grid-cols-2">
        {(order.pickupDate || order.deliveryDate) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {order.pickupDate && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                  <p className="font-medium">
                    {new Date(order.pickupDate).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  {order.pickupTimeSlot && (
                    <p className="text-muted-foreground">{order.pickupTimeSlot}</p>
                  )}
                </div>
              )}
              {order.deliveryDate && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Delivery</p>
                  <p className="font-medium">
                    {new Date(order.deliveryDate).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  {order.deliveryTimeSlot && (
                    <p className="text-muted-foreground">{order.deliveryTimeSlot}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(order.preferencesSnapshot || order.specialInstructions) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {order.preferencesSnapshot && (() => {
                const prefs = order.preferencesSnapshot as {
                  detergent?: string;
                  waterTemp?: string;
                  dryerTemp?: string;
                  fabricSoftener?: boolean;
                };
                return (
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
                );
              })()}
              {order.specialInstructions && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Special Instructions</p>
                  <p className="mt-1">{order.specialInstructions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.name} x{item.quantity}
                </span>
                <span className="font-medium">
                  {formatCurrency(item.totalPrice)}
                </span>
              </div>
            ))}
            <div className="border-t pt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </div>
              )}
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>
                    Discount
                    {order.promoCode ? ` (${order.promoCode.code})` : ""}
                  </span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              {order.tipAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tip</span>
                  <span>{formatCurrency(order.tipAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.statusHistory.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 text-sm">
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
      </Card>

      {/* Status Update */}
      {availableTransitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableTransitions.map((status) => (
                <Button
                  key={status}
                  variant={status === "cancelled" ? "destructive" : "default"}
                  size="sm"
                  disabled={statusUpdating}
                  onClick={() => handleStatusUpdate(status)}
                  className="gap-1"
                >
                  {statusUpdating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ArrowRight className="h-3 w-3" />
                  )}
                  {status.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refund Section */}
      {canRefund && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Refund</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={showRefund} onOpenChange={setShowRefund}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Issue Refund
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Issue Refund</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Refund Amount</Label>
                    <Input
                      type="number"
                      min="0.01"
                      max={order.totalAmount}
                      step="0.01"
                      placeholder={`Full refund: ${formatCurrency(order.totalAmount)}`}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Leave blank for full refund
                    </p>
                  </div>

                  <div>
                    <Label>Reason</Label>
                    <Select
                      value={refundReason}
                      onValueChange={setRefundReason}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="requested_by_customer">
                          Customer Request
                        </SelectItem>
                        <SelectItem value="duplicate">Duplicate</SelectItem>
                        <SelectItem value="fraudulent">Fraudulent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {order.customer && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={refundToWallet}
                        onChange={(e) => setRefundToWallet(e.target.checked)}
                        className="h-4 w-4 rounded"
                      />
                      Refund to customer wallet instead of card
                    </label>
                  )}

                  {refundResult?.error && (
                    <p className="text-sm text-destructive">
                      {refundResult.error}
                    </p>
                  )}

                  {refundResult?.success && (
                    <p className="text-sm text-green-600">
                      Refunded {formatCurrency(refundResult.refundAmount!)} via{" "}
                      {refundResult.refundType}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleRefund(!refundAmount)}
                      disabled={processing}
                    >
                      {processing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {refundAmount
                        ? `Refund ${formatCurrency(parseFloat(refundAmount))}`
                        : `Full Refund ${formatCurrency(order.totalAmount)}`}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
