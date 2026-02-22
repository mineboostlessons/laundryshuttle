"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeliveryProof } from "./delivery-proof";
import {
  MapPin,
  Phone,
  Navigation,
  Package,
  Truck,
  CheckCircle2,
  SkipForward,
  Loader2,
  Camera,
  User,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavigationUrl } from "@/lib/mapbox";

interface StopCardProps {
  stop: {
    id: string;
    stopType: string;
    sequence: number;
    address: string;
    lat: number;
    lng: number;
    status: string;
    completedAt: string | null;
    order: {
      id: string;
      orderNumber: string;
      status: string;
      numBags: number | null;
      pickupNotes: string | null;
      specialInstructions: string | null;
      deliveryPhotoUrl: string | null;
      signatureUrl: string | null;
      customer: {
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
      } | null;
    };
  };
  isNext: boolean;
  onUpdateStatus: (
    stopId: string,
    status: "en_route" | "arrived" | "completed" | "skipped"
  ) => Promise<void>;
  onCompleteDelivery: (
    stopId: string,
    data: { deliveryPhotoUrl?: string; signatureUrl?: string }
  ) => Promise<void>;
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  en_route: "bg-blue-100 text-blue-700",
  arrived: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  skipped: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  en_route: "En Route",
  arrived: "Arrived",
  completed: "Completed",
  skipped: "Skipped",
};

export function StopCard({
  stop,
  isNext,
  onUpdateStatus,
  onCompleteDelivery,
}: StopCardProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showProofDialog, setShowProofDialog] = useState(false);

  const customer = stop.order.customer;
  const customerName = customer
    ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim()
    : "Unknown";
  const isDone = stop.status === "completed" || stop.status === "skipped";

  async function handleAction(status: "en_route" | "arrived" | "completed" | "skipped") {
    setActionLoading(status);
    try {
      await onUpdateStatus(stop.id, status);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeliveryComplete(data: {
    deliveryPhotoUrl?: string;
    signatureUrl?: string;
  }) {
    await onCompleteDelivery(stop.id, data);
    setShowProofDialog(false);
  }

  return (
    <>
      <Card
        className={cn(
          "transition-all",
          isNext && !isDone && "ring-2 ring-primary shadow-md",
          isDone && "opacity-60"
        )}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  isDone ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                )}
              >
                {stop.sequence}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {stop.stopType === "pickup" ? "Pickup" : "Delivery"}
                  </span>
                  <Badge variant="secondary" className={statusColors[stop.status]}>
                    {statusLabels[stop.status]}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {stop.order.orderNumber}
                </span>
              </div>
            </div>
            {stop.order.numBags && (
              <Badge variant="outline" className="gap-1">
                <Package className="h-3 w-3" />
                {stop.order.numBags} bags
              </Badge>
            )}
          </div>

          {/* Customer & Address */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{customerName}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{stop.address}</span>
            </div>
            {customer?.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a
                  href={`tel:${customer.phone}`}
                  className="text-primary hover:underline"
                >
                  {customer.phone}
                </a>
              </div>
            )}
          </div>

          {/* Notes */}
          {(stop.order.pickupNotes || stop.order.specialInstructions) && (
            <div className="bg-muted/50 rounded-md p-2 mb-3">
              <div className="flex items-center gap-1 mb-1">
                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">Notes</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {stop.order.pickupNotes || stop.order.specialInstructions}
              </p>
            </div>
          )}

          {/* Actions */}
          {!isDone && (
            <div className="flex flex-wrap gap-2">
              {/* Navigate button - always available */}
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={getNavigationUrl(stop.lat, stop.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation className="h-3.5 w-3.5 mr-1" />
                  Navigate
                </a>
              </Button>

              {/* Status-specific actions */}
              {stop.status === "pending" && (
                <Button
                  size="sm"
                  onClick={() => handleAction("en_route")}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "en_route" ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Truck className="h-3.5 w-3.5 mr-1" />
                  )}
                  Start
                </Button>
              )}

              {stop.status === "en_route" && (
                <Button
                  size="sm"
                  onClick={() => handleAction("arrived")}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "arrived" ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                  )}
                  Arrived
                </Button>
              )}

              {stop.status === "arrived" && stop.stopType === "delivery" && (
                <Button
                  size="sm"
                  onClick={() => setShowProofDialog(true)}
                  disabled={actionLoading !== null}
                >
                  <Camera className="h-3.5 w-3.5 mr-1" />
                  Complete with Proof
                </Button>
              )}

              {stop.status === "arrived" && stop.stopType === "pickup" && (
                <Button
                  size="sm"
                  onClick={() => handleAction("completed")}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "completed" ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  Picked Up
                </Button>
              )}

              {/* Skip - always available when not done */}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => handleAction("skipped")}
                disabled={actionLoading !== null}
              >
                {actionLoading === "skipped" ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <SkipForward className="h-3.5 w-3.5 mr-1" />
                )}
                Skip
              </Button>
            </div>
          )}

          {/* Completed info */}
          {stop.status === "completed" && stop.completedAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              Completed at{" "}
              {new Date(stop.completedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Proof Dialog */}
      <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Delivery — {stop.order.orderNumber}</DialogTitle>
          </DialogHeader>
          <DeliveryProof onSubmit={handleDeliveryComplete} />
        </DialogContent>
      </Dialog>
    </>
  );
}
