import { Suspense } from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function OrdersListPage({ searchParams }: PageProps) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const params = await searchParams;
  const search = params.search || "";
  const statusFilter = params.status || "all";
  const page = parseInt(params.page || "1", 10);
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { customer: { email: { contains: search, mode: "insensitive" } } },
      { tenant: { businessName: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (statusFilter !== "all") {
    where.status = statusFilter;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderType: true,
        totalAmount: true,
        pickupDate: true,
        deliveryDate: true,
        createdAt: true,
        customer: {
          select: { firstName: true, lastName: true, email: true },
        },
        tenant: {
          select: { id: true, businessName: true, slug: true },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed": case "delivered": return "success" as const;
      case "cancelled": case "refunded": return "destructive" as const;
      case "in_progress": case "processing": case "washing": case "drying": return "default" as const;
      case "ready_for_pickup": case "out_for_delivery": return "warning" as const;
      default: return "secondary" as const;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">
          {total} order{total !== 1 ? "s" : ""} across all tenants
        </p>
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-10" />}>
        <form className="mb-4 flex flex-wrap gap-3">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by order #, email, or business..."
            className="rounded-md border bg-background px-3 py-2 text-sm w-72"
          />
          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="picked_up">Picked Up</option>
            <option value="processing">Processing</option>
            <option value="washing">Washing</option>
            <option value="drying">Drying</option>
            <option value="ready_for_pickup">Ready for Pickup</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Filter
          </button>
          {(search || statusFilter !== "all") && (
            <Link
              href="/admin/orders"
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Clear
            </Link>
          )}
        </form>
      </Suspense>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Order #</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium font-mono text-xs">
                    {order.orderNumber}
                  </td>
                  <td className="px-4 py-3">
                    {order.customer ? (
                      <div>
                        <p className="font-medium">
                          {order.customer.firstName || order.customer.lastName
                            ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim()
                            : "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">{order.customer.email}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Walk-in</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/tenants/${order.tenant.id}`}
                      className="text-primary hover:underline"
                    >
                      {order.tenant.businessName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {order.orderType.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(order.status)}>
                      {order.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {order.totalAmount != null ? formatCurrency(order.totalAmount) : "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDistanceToNow(order.createdAt, { addSuffix: true })}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/orders?page=${page - 1}&search=${search}&status=${statusFilter}`}
              >
                <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                  Previous
                </button>
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/orders?page=${page + 1}&search=${search}&status=${statusFilter}`}
              >
                <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                  Next
                </button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
