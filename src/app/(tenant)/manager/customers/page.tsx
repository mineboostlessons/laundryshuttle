import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import prisma from "@/lib/prisma";
import { CustomerListView } from "./customer-list-view";

export default async function ManagerCustomersPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const customers = await prisma.user.findMany({
    where: {
      tenantId: tenant.id,
      role: "customer",
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      createdAt: true,
      walletBalance: true,
      _count: { select: { ordersAsCustomer: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-muted-foreground">
          View and manage customer accounts
        </p>
      </div>
      <CustomerListView customers={customers} />
    </div>
  );
}
