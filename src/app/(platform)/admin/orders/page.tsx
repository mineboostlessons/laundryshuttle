import Link from "next/link";
import prisma from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    type?: string;
    tenant?: string;
    amountMin?: string;
    amountMax?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

export default async function OrdersListPage({ searchParams }: PageProps) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const params = await searchParams;
  const search = params.search || "";
  const statusFilter = params.status || "all";
  const typeFilter = params.type || "all";
  const tenantFilter = params.tenant || "all";
  const amountMin = params.amountMin || "";
  const amountMax = params.amountMax || "";
  const dateFrom = params.dateFrom || "";
  const dateTo = params.dateTo || "";
  const page = parseInt(params.page || "1", 10);
  const limit = 20;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { customer: { email: { contains: search, mode: "insensitive" } } },
      { customer: { firstName: { contains: search, mode: "insensitive" } } },
      { customer: { lastName: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (statusFilter !== "all") {
    where.status = statusFilter;
  }
  if (typeFilter !== "all") {
    where.orderType = typeFilter;
  }
  if (tenantFilter !== "all") {
    where.tenantId = tenantFilter;
  }
  if (amountMin || amountMax) {
    const amountCondition: Record<string, number> = {};
    if (amountMin) amountCondition.gte = parseFloat(amountMin);
    if (amountMax) amountCondition.lte = parseFloat(amountMax);
    where.totalAmount = amountCondition;
  }
  if (dateFrom || dateTo) {
    const dateCondition: Record<string, Date> = {};
    if (dateFrom) dateCondition.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      dateCondition.lte = end;
    }
    where.createdAt = dateCondition;
  }

  // Fetch orders, count, and tenants for filter dropdown in parallel
  const [orders, total, tenants] = await Promise.all([
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
    prisma.tenant.findMany({
      where: { isActive: true },
      orderBy: { businessName: "asc" },
      select: { id: true, businessName: true },
    }),
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

  const hasFilters = search || statusFilter !== "all" || typeFilter !== "all" ||
    tenantFilter !== "all" || amountMin || amountMax || dateFrom || dateTo;

  // Build query string for pagination links
  const filterParams = new URLSearchParams();
  if (search) filterParams.set("search", search);
  if (statusFilter !== "all") filterParams.set("status", statusFilter);
  if (typeFilter !== "all") filterParams.set("type", typeFilter);
  if (tenantFilter !== "all") filterParams.set("tenant", tenantFilter);
  if (amountMin) filterParams.set("amountMin", amountMin);
  if (amountMax) filterParams.set("amountMax", amountMax);
  if (dateFrom) filterParams.set("dateFrom", dateFrom);
  if (dateTo) filterParams.set("dateTo", dateTo);
  const filterString = filterParams.toString();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">
          {total} order{total !== 1 ? "s" : ""} across all tenants
        </p>
      </div>

      {/* Filters */}
      <form className="mb-4 rounded-lg border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Search</label>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Order #, customer name or email..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
          </div>

          {/* Order Type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Order Type</label>
            <select
              name="type"
              defaultValue={typeFilter}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="delivery">Delivery</option>
              <option value="walk_in">Walk-in</option>
              <option value="pos">POS</option>
            </select>
          </div>

          {/* Tenant */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tenant</label>
            <select
              name="tenant"
              defaultValue={tenantFilter}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Tenants</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.businessName}</option>
              ))}
            </select>
          </div>

          {/* Amount Min */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Amount Min ($)</label>
            <input
              type="number"
              name="amountMin"
              defaultValue={amountMin}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Amount Max */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Amount Max ($)</label>
            <input
              type="number"
              name="amountMax"
              defaultValue={amountMax}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Date From */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Created From</label>
            <input
              type="date"
              name="dateFrom"
              defaultValue={dateFrom}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Created To</label>
            <input
              type="date"
              name="dateTo"
              defaultValue={dateTo}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-3 flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Apply Filters
          </button>
          {hasFilters && (
            <Link
              href="/admin/orders"
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Clear All
            </Link>
          )}
        </div>
      </form>

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
                    <span title={order.createdAt ? format(order.createdAt, "MMM d, yyyy h:mm a") : ""}>
                      {formatDistanceToNow(order.createdAt, { addSuffix: true })}
                    </span>
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
                href={`/admin/orders?page=${page - 1}${filterString ? `&${filterString}` : ""}`}
              >
                <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                  Previous
                </button>
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/orders?page=${page + 1}${filterString ? `&${filterString}` : ""}`}
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
