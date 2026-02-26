import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  params: Promise<{ customerId: string }>;
}

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

export default async function ManagerCustomerDetailPage({ params }: Props) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();
  const { customerId } = await params;

  const customer = await prisma.user.findFirst({
    where: { id: customerId, tenantId: tenant.id, role: "customer" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      createdAt: true,
      walletBalance: true,
      ordersAsCustomer: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          orderType: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: { select: { ordersAsCustomer: true } },
    },
  });

  if (!customer) notFound();

  const name = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || customer.email;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <Link
          href="/manager/customers"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Customers
        </Link>
        <h1 className="text-2xl font-bold">{name}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{customer.email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Phone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{customer.phone ?? "Not provided"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">{formatCurrency(customer.walletBalance)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Orders ({customer._count.ordersAsCustomer})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer.ordersAsCustomer.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet</p>
          ) : (
            <div className="divide-y">
              {customer.ordersAsCustomer.map((order) => (
                <Link
                  key={order.id}
                  href={`/manager/orders/${order.id}`}
                  className="flex items-center justify-between py-3 hover:bg-muted/50 transition-colors px-2 rounded"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>
                      {order.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
