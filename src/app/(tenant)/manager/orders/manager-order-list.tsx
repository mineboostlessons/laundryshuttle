"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  customer: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
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
}: {
  orders: Order[];
  pagination: Pagination;
  currentStatus?: string;
}) {
  const router = useRouter();

  function setFilter(status?: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    router.push(`/manager/orders?${params.toString()}`);
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
                return (
                  <Link
                    key={order.id}
                    href={`/dashboard/orders/${order.id}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 transition-colors px-2 rounded"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {name} &middot; {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-medium">
                        {formatCurrency(order.totalAmount)}
                      </span>
                      <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </Link>
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
