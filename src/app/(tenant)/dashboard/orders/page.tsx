import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { listOrders } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  processing: "default",
  completed: "default",
  cancelled: "destructive",
  refunded: "destructive",
  partially_refunded: "outline",
};

export default async function OrdersPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const { orders, pagination } = await listOrders();

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <h1 className="text-xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {pagination.total} total orders
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-4xl p-6">
        <div className="space-y-3">
          {orders.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No orders yet
              </CardContent>
            </Card>
          )}

          {orders.map((order) => (
            <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">
                        {order.orderNumber}
                      </span>
                      <Badge
                        variant={STATUS_COLORS[order.status] ?? "secondary"}
                      >
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.customer
                        ? `${order.customer.firstName ?? ""} ${order.customer.lastName ?? ""} (${order.customer.email})`
                        : "Guest"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(order.totalAmount)}
                    </p>
                    {order.paidAt && (
                      <p className="text-xs text-green-600">Paid</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
