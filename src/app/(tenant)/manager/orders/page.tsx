import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { listOrders } from "@/app/(tenant)/dashboard/orders/actions";
import { ManagerOrderList } from "./manager-order-list";

export default async function ManagerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const params = await searchParams;

  const { orders, pagination } = await listOrders({
    status: params.status,
    page: params.page ? parseInt(params.page) : 1,
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground">
          View and manage all customer orders
        </p>
      </div>
      <ManagerOrderList
        orders={orders}
        pagination={pagination}
        currentStatus={params.status}
      />
    </div>
  );
}
