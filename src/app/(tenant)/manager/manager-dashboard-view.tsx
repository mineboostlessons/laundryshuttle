"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Package,
  Truck,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
} from "lucide-react";
import { updateOrderStatus, searchCustomers } from "./actions";

interface PickupDelivery {
  id: string;
  orderNumber: string;
  status: string;
  pickupTimeSlot?: string | null;
  deliveryTimeSlot?: string | null;
  pickupDate?: Date | null;
  deliveryDate?: Date | null;
  customer: { firstName: string | null; lastName: string | null; phone: string | null } | null;
  pickupAddress: { addressLine1: string; city: string } | null;
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  totalAmount: number;
  createdAt: Date;
  customer: { firstName: string | null; lastName: string | null; email: string } | null;
  attendant?: { firstName: string | null; lastName: string | null } | null;
}

interface ManagerStats {
  todayPickups: PickupDelivery[];
  todayDeliveries: PickupDelivery[];
  pendingOrders: OrderSummary[];
  processingOrders: OrderSummary[];
  readyOrders: OrderSummary[];
  activeDrivers: number;
  activeAttendants: number;
  todayCompletedOrders: number;
  todayRevenue: number;
  openIssues: number;
}

interface CustomerResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  _count: { ordersAsCustomer: number };
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  pending: "warning",
  confirmed: "default",
  picked_up: "secondary",
  processing: "default",
  ready: "success",
  out_for_delivery: "default",
  delivered: "success",
  completed: "success",
  cancelled: "destructive",
};

export function ManagerDashboardView({ stats }: { stats: ManagerStats }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  async function handleStatusUpdate(orderId: string, status: string) {
    startTransition(async () => {
      await updateOrderStatus({ orderId, status: status as "confirmed" });
      router.refresh();
    });
  }

  async function handleCustomerSearch() {
    if (customerQuery.length < 2) return;
    setSearchingCustomers(true);
    try {
      const results = await searchCustomers(customerQuery);
      setCustomerResults(results);
    } finally {
      setSearchingCustomers(false);
    }
  }

  function customerName(c: { firstName: string | null; lastName: string | null; email?: string } | null) {
    if (!c) return "Walk-in";
    const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
    return name || c.email || "Unknown";
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operations</h1>
        <p className="text-muted-foreground">
          Today&apos;s overview and order management
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.todayRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pickups Today</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayPickups.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Deliveries Today</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayDeliveries.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCompletedOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openIssues}</div>
          </CardContent>
        </Card>
      </div>

      {/* Staff on duty */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-semibold">{stats.activeDrivers}</span>
              <span className="text-sm text-muted-foreground">available</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Attendants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-semibold">{stats.activeAttendants}</span>
              <span className="text-sm text-muted-foreground">on shift</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Pickups & Deliveries */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Pickups</CardTitle>
            <CardDescription>
              {stats.todayPickups.length} scheduled pickups
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.todayPickups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pickups scheduled for today</p>
            ) : (
              <div className="space-y-3">
                {stats.todayPickups.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{p.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {customerName(p.customer)} {p.pickupTimeSlot ? `| ${p.pickupTimeSlot}` : ""}
                      </p>
                      {p.pickupAddress && (
                        <p className="text-xs text-muted-foreground">
                          {p.pickupAddress.addressLine1}, {p.pickupAddress.city}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"}>
                        {p.status.replace(/_/g, " ")}
                      </Badge>
                      {p.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleStatusUpdate(p.id, "picked_up")}
                        >
                          Mark Picked Up
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Deliveries</CardTitle>
            <CardDescription>
              {stats.todayDeliveries.length} scheduled deliveries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.todayDeliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deliveries scheduled for today</p>
            ) : (
              <div className="space-y-3">
                {stats.todayDeliveries.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{d.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {customerName(d.customer)} {d.deliveryTimeSlot ? `| ${d.deliveryTimeSlot}` : ""}
                      </p>
                      {d.pickupAddress && (
                        <p className="text-xs text-muted-foreground">
                          {d.pickupAddress.addressLine1}, {d.pickupAddress.city}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANT[d.status] ?? "secondary"}>
                        {d.status.replace(/_/g, " ")}
                      </Badge>
                      {d.status === "ready" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleStatusUpdate(d.id, "out_for_delivery")}
                        >
                          Out for Delivery
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Queue Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Order Queue</CardTitle>
          <CardDescription>Orders requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({stats.pendingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="processing">
                Processing ({stats.processingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="ready">
                Ready ({stats.readyOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              <OrderQueue
                orders={stats.pendingOrders}
                nextAction="confirmed"
                nextLabel="Confirm"
                onAction={handleStatusUpdate}
                isPending={isPending}
              />
            </TabsContent>

            <TabsContent value="processing" className="mt-4">
              <OrderQueue
                orders={stats.processingOrders}
                nextAction="ready"
                nextLabel="Mark Ready"
                onAction={handleStatusUpdate}
                isPending={isPending}
              />
            </TabsContent>

            <TabsContent value="ready" className="mt-4">
              <OrderQueue
                orders={stats.readyOrders}
                nextAction="out_for_delivery"
                nextLabel="Out for Delivery"
                onAction={handleStatusUpdate}
                isPending={isPending}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Customer Lookup */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Lookup</CardTitle>
          <CardDescription>Search by name, email, or phone</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search customers..."
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomerSearch()}
            />
            <Button
              variant="outline"
              onClick={handleCustomerSearch}
              disabled={searchingCustomers || customerQuery.length < 2}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {customerResults.length > 0 && (
            <div className="divide-y rounded-md border">
              {customerResults.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {c.firstName ? `${c.firstName} ${c.lastName ?? ""}` : c.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.email} {c.phone ? `| ${c.phone}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {c._count.ordersAsCustomer} orders
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Order Queue Sub-component
// =============================================================================

function OrderQueue({
  orders,
  nextAction,
  nextLabel,
  onAction,
  isPending,
}: {
  orders: OrderSummary[];
  nextAction: string;
  nextLabel: string;
  onAction: (orderId: string, status: string) => void;
  isPending: boolean;
}) {
  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">No orders in this status</p>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => {
        const customerName = order.customer
          ? `${order.customer.firstName ?? ""} ${order.customer.lastName ?? ""}`.trim() ||
            order.customer.email
          : "Walk-in";

        return (
          <div
            key={order.id}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{order.orderNumber}</p>
                <Badge variant="outline" className="text-xs capitalize">
                  {order.orderType.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {customerName} &middot; {formatCurrency(order.totalAmount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => onAction(order.id, nextAction)}
            >
              {nextLabel}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
