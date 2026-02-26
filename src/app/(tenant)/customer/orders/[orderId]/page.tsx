import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { LocalDateOnly } from "@/components/ui/local-date";
import { getOrderDetail } from "../../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  MapPin,
  Truck,
  Phone,
  Calendar,
  Clock,
  Package,
} from "lucide-react";
import { OrderStatusBadge } from "../../components/order-status-badge";
import { OrderTimeline } from "./order-timeline";
import { ReviewForm } from "./review-form";
import { TipForm } from "./tip-form";
import { StarRating } from "@/components/ui/star-rating";

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

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { orderId } = await params;
  const order = await getOrderDetail(orderId);

  if (!order) notFound();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/customer/orders"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Placed on{" "}
            <LocalDateOnly
              date={order.createdAt}
              options={{
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }}
            />
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline history={order.statusHistory} />
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items</CardTitle>
            </CardHeader>
            <CardContent>
              {order.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No items recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} x {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        {formatCurrency(item.totalPrice)}
                      </p>
                    </div>
                  ))}
                  <Separator />
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    {order.deliveryFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Delivery Fee
                        </span>
                        <span>{formatCurrency(order.deliveryFee)}</span>
                      </div>
                    )}
                    {order.taxAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{formatCurrency(order.taxAmount)}</span>
                      </div>
                    )}
                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(order.discountAmount)}</span>
                      </div>
                    )}
                    {order.tipAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tip</span>
                        <span>{formatCurrency(order.tipAmount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Proof */}
          {order.deliveryPhotoUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Delivery Proof</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={order.deliveryPhotoUrl}
                  alt="Delivery proof"
                  className="rounded-lg max-w-md w-full"
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {order.laundromat.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.laundromat.address}
                  </p>
                </div>
              </div>
              {order.pickupAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Pickup Address</p>
                    <p className="text-xs text-muted-foreground">
                      {order.pickupAddress.addressLine1}
                      {order.pickupAddress.addressLine2 &&
                        `, ${order.pickupAddress.addressLine2}`}
                      <br />
                      {order.pickupAddress.city}, {order.pickupAddress.state}{" "}
                      {order.pickupAddress.zip}
                    </p>
                    {(order.pickupNotes || order.pickupAddress.pickupNotes) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium">Instructions: </span>
                        {order.pickupNotes || order.pickupAddress.pickupNotes}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.pickupDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pickup</p>
                    <p className="text-sm">
                      <LocalDateOnly date={order.pickupDate} />
                      {order.pickupTimeSlot && ` (${order.pickupTimeSlot})`}
                    </p>
                  </div>
                </div>
              )}
              {order.deliveryDate && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery</p>
                    <p className="text-sm">
                      <LocalDateOnly date={order.deliveryDate} />
                      {order.deliveryTimeSlot &&
                        ` (${order.deliveryTimeSlot})`}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preferences */}
          {order.preferencesSnapshot && (() => {
            const prefs = order.preferencesSnapshot as {
              detergent?: string;
              waterTemp?: string;
              dryerTemp?: string;
              fabricSoftener?: boolean;
            };
            const hasPrefs = prefs.detergent || prefs.waterTemp || prefs.dryerTemp || prefs.fabricSoftener;
            if (!hasPrefs) return null;
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {prefs.detergent && (
                      <Badge variant="outline" className="text-xs">
                        Detergent: {PREF_LABELS[prefs.detergent] ?? prefs.detergent}
                      </Badge>
                    )}
                    {prefs.waterTemp && (
                      <Badge variant="outline" className="text-xs">
                        Water: {PREF_LABELS[prefs.waterTemp] ?? prefs.waterTemp}
                      </Badge>
                    )}
                    {prefs.dryerTemp && (
                      <Badge variant="outline" className="text-xs">
                        Dryer: {PREF_LABELS[prefs.dryerTemp] ?? prefs.dryerTemp}
                      </Badge>
                    )}
                    {prefs.fabricSoftener && (
                      <Badge variant="outline" className="text-xs">
                        Fabric Softener
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Driver */}
          {order.driver && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Driver</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">
                    {order.driver.firstName} {order.driver.lastName}
                  </p>
                </div>
                {order.driver.phone && (
                  <div className="flex items-center gap-2 mt-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{order.driver.phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Method</span>
                <span className="text-sm capitalize">
                  {order.paymentMethod?.replace("_", " ") ?? "Pending"}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Status</span>
                {order.paidAt ? (
                  <Badge variant="success">Paid</Badge>
                ) : (
                  <Badge variant="warning">Unpaid</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Special Instructions */}
          {order.specialInstructions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Special Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {order.specialInstructions}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Existing Review Display */}
          {order.review && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <StarRating value={order.review.rating} readOnly size="sm" />
                {order.review.text && (
                  <p className="text-sm text-muted-foreground">
                    {order.review.text}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {!order.review &&
              (order.status === "delivered" ||
                order.status === "completed") && (
                <ReviewForm
                  orderId={order.id}
                  tenantSlug=""
                />
              )}
            {(order.status === "delivered" ||
              order.status === "completed" ||
              order.status === "out_for_delivery") && (
              <TipForm
                orderId={order.id}
                subtotal={order.subtotal}
                driverName={
                  order.driver
                    ? `${order.driver.firstName} ${order.driver.lastName}`
                    : undefined
                }
                hasTip={order.tips.length > 0}
                existingTipAmount={order.tipAmount}
              />
            )}
            <Link href="/order" className="block">
              <Button className="w-full">Reorder</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
