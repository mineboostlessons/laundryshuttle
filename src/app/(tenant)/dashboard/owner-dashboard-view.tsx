"use client";

import Link from "next/link";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Package,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
} from "lucide-react";
import { RevenueChart } from "./revenue-chart";

interface DashboardStats {
  orders: { today: number; week: number; month: number };
  revenue: { today: number; week: number; month: number };
  statusCounts: Record<string, number>;
  totalCustomers: number;
  totalStaff: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    orderType: string;
    totalAmount: number;
    createdAt: Date;
    customer: { firstName: string | null; lastName: string | null; email: string } | null;
  }>;
  staffMembers: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
    lastLoginAt: Date | null;
  }>;
}

interface ChartDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  pending: { label: "Pending", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "default" },
  picked_up: { label: "Picked Up", variant: "secondary" },
  processing: { label: "Processing", variant: "default" },
  ready: { label: "Ready", variant: "success" },
  out_for_delivery: { label: "Out for Delivery", variant: "default" },
  delivered: { label: "Delivered", variant: "success" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  refunded: { label: "Refunded", variant: "destructive" },
  partially_refunded: { label: "Partial Refund", variant: "warning" },
};

export function OwnerDashboardView({
  stats,
  chartData,
}: {
  stats: DashboardStats;
  chartData: ChartDataPoint[];
}) {
  const activeOrders =
    (stats.statusCounts["pending"] ?? 0) +
    (stats.statusCounts["confirmed"] ?? 0) +
    (stats.statusCounts["picked_up"] ?? 0) +
    (stats.statusCounts["processing"] ?? 0) +
    (stats.statusCounts["ready"] ?? 0) +
    (stats.statusCounts["out_for_delivery"] ?? 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div data-tour="dashboard-header">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your business performance
        </p>
      </div>

      {/* Revenue & Order Stats */}
      <div data-tour="stats-grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/analytics" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Today&apos;s Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.revenue.today)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.orders.today} orders
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/analytics" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                This Week
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.revenue.week)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.orders.week} orders
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/analytics" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                This Month
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.revenue.month)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.orders.month} orders
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/orders" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Active Orders
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeOrders}</div>
              <p className="text-xs text-muted-foreground">
                In progress right now
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/customers" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/staff" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Staff</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStaff}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/orders" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.statusCounts["pending"] ?? 0}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/orders" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.statusCounts["completed"] ?? 0}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue (Last 30 Days)</CardTitle>
          <CardDescription>Daily revenue and order volume</CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chartData} />
        </CardContent>
      </Card>

      {/* Order Pipeline & Recent Orders */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle>Order Pipeline</CardTitle>
            <CardDescription>Orders by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { status: "pending", icon: Clock },
                { status: "confirmed", icon: CheckCircle },
                { status: "picked_up", icon: Truck },
                { status: "processing", icon: Package },
                { status: "ready", icon: CheckCircle },
                { status: "out_for_delivery", icon: Truck },
                { status: "delivered", icon: CheckCircle },
              ].map(({ status, icon: Icon }) => {
                const count = stats.statusCounts[status] ?? 0;
                const config = STATUS_CONFIG[status];
                return (
                  <div
                    key={status}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{config?.label ?? status}</span>
                    </div>
                    <Badge variant={config?.variant ?? "secondary"}>
                      {count}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest 10 orders</CardDescription>
            </div>
            <Link href="/dashboard/orders">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentOrders.length === 0 && (
                <p className="text-sm text-muted-foreground">No orders yet</p>
              )}
              {stats.recentOrders.map((order) => {
                const config = STATUS_CONFIG[order.status];
                const customerName = order.customer
                  ? `${order.customer.firstName ?? ""} ${order.customer.lastName ?? ""}`.trim() ||
                    order.customer.email
                  : "Walk-in";
                return (
                  <Link
                    key={order.id}
                    href={`/dashboard/orders/${order.id}`}
                    className="flex items-center justify-between rounded-md p-2 hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {customerName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-medium">
                        {formatCurrency(order.totalAmount)}
                      </span>
                      <Badge variant={config?.variant ?? "secondary"} className="text-xs">
                        {config?.label ?? order.status}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Staff</CardTitle>
            <CardDescription>Active team members</CardDescription>
          </div>
          <Link href="/dashboard/staff">
            <Button variant="outline" size="sm">
              Manage Staff
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {stats.staffMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No staff members yet. Add your team to get started.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.staffMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {(member.firstName?.[0] ?? member.email[0]).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.firstName
                        ? `${member.firstName} ${member.lastName ?? ""}`
                        : member.email}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {member.role}
                      </Badge>
                      {member.lastLoginAt && (
                        <span className="text-xs text-muted-foreground">
                          Last seen{" "}
                          {new Date(member.lastLoginAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/analytics">
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </Link>
            <Link href="/dashboard/orders">
              <Button variant="outline" size="sm">
                <Package className="h-4 w-4 mr-2" />
                View Orders
              </Button>
            </Link>
            <Link href="/dashboard/subscriptions">
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Subscriptions
              </Button>
            </Link>
            <Link href="/dashboard/promo-codes">
              <Button variant="outline" size="sm">
                <AlertCircle className="h-4 w-4 mr-2" />
                Promo Codes
              </Button>
            </Link>
            <Link href="/dashboard/campaigns">
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Win-Back Campaigns
              </Button>
            </Link>
            <Link href="/settings/payments">
              <Button variant="outline" size="sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Payment Settings
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" size="sm">
                Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
