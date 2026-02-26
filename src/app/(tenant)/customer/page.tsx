import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { LocalDateOnly } from "@/components/ui/local-date";
import { getCustomerDashboard, getCustomerUpsells } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  MapPin,
  Wallet,
  Clock,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { OrderStatusBadge } from "./components/order-status-badge";
import { UpsellBanner } from "@/components/upsell/upsell-banner";

export default async function CustomerDashboardPage() {
  const [data, upsells] = await Promise.all([
    getCustomerDashboard(),
    getCustomerUpsells(),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {data.firstName ? `Welcome back, ${data.firstName}` : "Dashboard"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Track your orders and manage your account.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/customer/orders" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{data.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/customer/orders" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-yellow-100 p-3">
                  <Clock className="h-5 w-5 text-yellow-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Orders</p>
                  <p className="text-2xl font-bold">{data.activeOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/customer/profile" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-green-100 p-3">
                  <Wallet className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Wallet Balance</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(data.walletBalance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/customer/addresses" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3">
                  <MapPin className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Saved Addresses
                  </p>
                  <p className="text-2xl font-bold">{data.addressCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Upsell Recommendations */}
      {upsells.length > 0 && <UpsellBanner recommendations={upsells} />}

      {/* Subscription Banner */}
      {data.activeSubscription ? (
        <Link href="/customer/subscriptions">
          <Card className="border-primary/20 bg-primary/5 hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{data.activeSubscription.plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Next pickup:{" "}
                    {data.activeSubscription.nextPickupDate
                      ? <LocalDateOnly date={data.activeSubscription.nextPickupDate} />
                      : "Not scheduled"}
                  </p>
                </div>
              </div>
              <Badge variant="success">Active</Badge>
            </CardContent>
          </Card>
        </Link>
      ) : (
        <Link href="/customer/subscriptions">
          <Card className="border-dashed border-2 hover:shadow-md transition-shadow hover:border-primary/40">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Save with a Subscription</p>
                  <p className="text-sm text-muted-foreground">
                    Get automatic scheduled pickups and save on every order
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                View Plans
              </Button>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">Recent Orders</CardTitle>
          <Link href="/customer/orders">
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {data.recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No orders yet.
              </p>
              <Link href="/order">
                <Button className="mt-4" size="sm">
                  Place Your First Order
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/customer/orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {order.orderNumber}
                      </p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {order.laundromat.name} &middot;{" "}
                      <LocalDateOnly date={order.createdAt} />
                    </p>
                  </div>
                  <p className="font-semibold text-sm whitespace-nowrap ml-4">
                    {formatCurrency(order.totalAmount)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/order">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6 text-center">
              <Package className="mx-auto h-8 w-8 text-primary mb-2" />
              <p className="font-medium">New Order</p>
              <p className="text-xs text-muted-foreground mt-1">
                Schedule a pickup
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/customer/addresses">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6 text-center">
              <MapPin className="mx-auto h-8 w-8 text-primary mb-2" />
              <p className="font-medium">Manage Addresses</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add or edit pickup locations
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/customer/profile">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6 text-center">
              <RefreshCw className="mx-auto h-8 w-8 text-primary mb-2" />
              <p className="font-medium">Preferences</p>
              <p className="text-xs text-muted-foreground mt-1">
                Update laundry settings
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
