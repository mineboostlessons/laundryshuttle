import { Suspense } from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { TenantSearchFilter } from "./tenant-search-filter";
import { SortableHeader } from "@/components/ui/sortable-header";

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string; sortBy?: string; sortOrder?: string }>;
}

export default async function TenantsListPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const statusFilter = params.status || "all";
  const page = parseInt(params.page || "1", 10);
  const sortBy = params.sortBy || "createdAt";
  const sortOrder = (params.sortOrder === "asc" ? "asc" : "desc") as "asc" | "desc";
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (statusFilter === "active") where.isActive = true;
  if (statusFilter === "inactive") where.isActive = false;

  // Build dynamic orderBy
  const countColumns: Record<string, string> = { users: "users", orders: "orders", laundromats: "laundromats" };
  const orderBy = countColumns[sortBy]
    ? { [countColumns[sortBy]]: { _count: sortOrder } }
    : { [sortBy]: sortOrder };

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      orderBy,
      take: limit,
      skip: (page - 1) * limit,
      select: {
        id: true,
        slug: true,
        businessName: true,
        businessType: true,
        email: true,
        phone: true,
        isActive: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        onboardingComplete: true,
        createdAt: true,
        _count: { select: { users: true, orders: true, laundromats: true } },
      },
    }),
    prisma.tenant.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            {total} tenant{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/admin/onboarding">
          <Button>+ New Tenant</Button>
        </Link>
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <TenantSearchFilter search={search} status={statusFilter} />
      </Suspense>

      {/* Table */}
      <div className="mt-4 rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <SortableHeader column="businessName" label="Business" currentSort={sortBy} currentOrder={sortOrder} basePath="/admin/tenants" filterParams={`search=${search}&status=${statusFilter}`} />
                <SortableHeader column="businessType" label="Type" currentSort={sortBy} currentOrder={sortOrder} basePath="/admin/tenants" filterParams={`search=${search}&status=${statusFilter}`} />
                <SortableHeader column="isActive" label="Status" currentSort={sortBy} currentOrder={sortOrder} basePath="/admin/tenants" filterParams={`search=${search}&status=${statusFilter}`} />
                <SortableHeader column="subscriptionStatus" label="Subscription" currentSort={sortBy} currentOrder={sortOrder} basePath="/admin/tenants" filterParams={`search=${search}&status=${statusFilter}`} />
                <SortableHeader column="laundromats" label="Locations" currentSort={sortBy} currentOrder={sortOrder} basePath="/admin/tenants" filterParams={`search=${search}&status=${statusFilter}`} />
                <SortableHeader column="users" label="Users" currentSort={sortBy} currentOrder={sortOrder} basePath="/admin/tenants" filterParams={`search=${search}&status=${statusFilter}`} />
                <SortableHeader column="orders" label="Orders" currentSort={sortBy} currentOrder={sortOrder} basePath="/admin/tenants" filterParams={`search=${search}&status=${statusFilter}`} />
                <SortableHeader column="createdAt" label="Created" currentSort={sortBy} currentOrder={sortOrder} basePath="/admin/tenants" filterParams={`search=${search}&status=${statusFilter}`} />
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/tenants/${tenant.id}`}
                      className="font-medium hover:underline"
                    >
                      {tenant.businessName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {tenant.businessType.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={tenant.isActive ? "success" : "secondary"}>
                      {tenant.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        tenant.subscriptionStatus === "active"
                          ? "success"
                          : tenant.subscriptionStatus === "trialing"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {tenant.subscriptionStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{tenant._count.laundromats}</td>
                  <td className="px-4 py-3">{tenant._count.users}</td>
                  <td className="px-4 py-3">{tenant._count.orders}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDistanceToNow(tenant.createdAt, { addSuffix: true })}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No tenants found.
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
                href={`/admin/tenants?page=${page - 1}&search=${search}&status=${statusFilter}&sortBy=${sortBy}&sortOrder=${sortOrder}`}
              >
                <Button variant="outline" size="sm">Previous</Button>
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/tenants?page=${page + 1}&search=${search}&status=${statusFilter}&sortBy=${sortBy}&sortOrder=${sortOrder}`}
              >
                <Button variant="outline" size="sm">Next</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
