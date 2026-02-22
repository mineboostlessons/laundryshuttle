import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getCustomerOrders } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";
import { OrderStatusBadge } from "../components/order-status-badge";
import { OrderFilters } from "./order-filters";

interface OrdersPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const status = params.status ?? "all";
  const search = params.search ?? "";

  const { orders, pagination } = await getCustomerOrders({
    page,
    limit: 10,
    status,
    search,
  });

  function buildUrl(overrides: Record<string, string | number>) {
    const p = new URLSearchParams();
    if (status !== "all") p.set("status", status);
    if (search) p.set("search", search);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === "all" || v === "" || v === 1) {
        p.delete(k);
      } else {
        p.set(k, String(v));
      }
    }
    const qs = p.toString();
    return `/customer/orders${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Order History</h1>
        <p className="text-muted-foreground text-sm">
          View and track all your orders.
        </p>
      </div>

      <OrderFilters currentStatus={status} currentSearch={search} />

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No orders found.
            </p>
            <Link href="/order">
              <Button className="mt-4" size="sm">
                Place an Order
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/customer/orders/${order.id}`}
              className="block"
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{order.orderNumber}</p>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.laundromat.name}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          {new Date(order.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </span>
                        {order.items.length > 0 && (
                          <span>
                            {order.items.length} item
                            {order.items.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {order.totalWeightLbs && (
                          <span>{order.totalWeightLbs} lbs</span>
                        )}
                      </div>
                    </div>
                    <p className="text-lg font-bold whitespace-nowrap">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total}{" "}
            orders)
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link href={buildUrl({ page: pagination.page - 1 })}>
                <Button variant="outline" size="sm">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link href={buildUrl({ page: pagination.page + 1 })}>
                <Button variant="outline" size="sm">
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
