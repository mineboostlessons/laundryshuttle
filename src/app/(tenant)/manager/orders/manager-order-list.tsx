"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { assignDriverToOrder } from "@/app/(tenant)/manager/actions";

interface Driver {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  totalAmount: number;
  discountAmount: number;
  paymentMethod: string | null;
  paidAt: Date | null;
  createdAt: Date;
  driverId: string | null;
  customer: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  driver: Driver | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUSES = [
  { value: undefined, label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "picked_up", label: "Picked Up" },
  { value: "processing", label: "Processing" },
  { value: "ready", label: "Ready" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  pending: "warning",
  confirmed: "default",
  processing: "default",
  ready: "success",
  out_for_delivery: "default",
  delivered: "success",
  completed: "success",
  cancelled: "destructive",
  refunded: "destructive",
};

export function ManagerOrderList({
  orders,
  pagination,
  currentStatus,
  availableDrivers = [],
}: {
  orders: Order[];
  pagination: Pagination;
  currentStatus?: string;
  availableDrivers?: Driver[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setFilter(status?: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    router.push(`/manager/orders?${params.toString()}`);
  }

  function handleDriverAssign(orderId: string, driverId: string) {
    if (!driverId) return;
    startTransition(async () => {
      await assignDriverToOrder({ orderId, driverId });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s.label}
            variant={currentStatus === s.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {/* Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {pagination.total} orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders found</p>
          ) : (
            <div className="divide-y">
              {orders.map((order) => {
                const name = order.customer
                  ? `${order.customer.firstName ?? ""} ${order.customer.lastName ?? ""}`.trim() ||
                    order.customer.email
                  : "Walk-in";
                const driverName = order.driver
                  ? `${order.driver.firstName ?? ""} ${order.driver.lastName ?? ""}`.trim()
                  : null;

                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-3 px-2 rounded gap-2"
                  >
                    <Link
                      href={`/manager/orders/${order.id}`}
                      className="flex-1 min-w-0 hover:bg-muted/50 transition-colors rounded px-1"
                    >
                      <p className="text-sm font-medium">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {name} &middot; {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </Link>

                    {/* Inline Driver Assignment */}
                    {availableDrivers.length > 0 && order.orderType === "delivery" && (
                      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={order.driverId ?? ""}
                          onChange={(e) => handleDriverAssign(order.id, e.target.value)}
                          disabled={isPending}
                          className="h-7 w-32 sm:w-36 rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          title={driverName ?? "Assign driver"}
                        >
                          <option value="">No driver</option>
                          {availableDrivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {[d.firstName, d.lastName].filter(Boolean).join(" ") || "Unnamed"}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-medium">
                        {formatCurrency(order.totalAmount)}
                      </span>
                      <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (currentStatus) params.set("status", currentStatus);
                    params.set("page", String(pagination.page - 1));
                    router.push(`/manager/orders?${params.toString()}`);
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (currentStatus) params.set("status", currentStatus);
                    params.set("page", String(pagination.page + 1));
                    router.push(`/manager/orders?${params.toString()}`);
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
