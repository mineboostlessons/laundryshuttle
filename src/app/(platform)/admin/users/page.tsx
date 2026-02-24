import { Suspense } from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";

interface PageProps {
  searchParams: Promise<{ search?: string; role?: string; page?: string }>;
}

export default async function UsersListPage({ searchParams }: PageProps) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const params = await searchParams;
  const search = params.search || "";
  const roleFilter = params.role || "all";
  const page = parseInt(params.page || "1", 10);
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (roleFilter !== "all") {
    where.role = roleFilter;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        tenant: {
          select: { id: true, businessName: true, slug: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "platform_admin": return "destructive" as const;
      case "owner": return "default" as const;
      case "manager": return "default" as const;
      case "driver": return "warning" as const;
      case "attendant": return "warning" as const;
      case "customer": return "secondary" as const;
      default: return "secondary" as const;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">
          {total} user{total !== 1 ? "s" : ""} across all tenants
        </p>
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-10" />}>
        <form className="mb-4 flex flex-wrap gap-3">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by name or email..."
            className="rounded-md border bg-background px-3 py-2 text-sm w-64"
          />
          <select
            name="role"
            defaultValue={roleFilter}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Roles</option>
            <option value="platform_admin">Platform Admin</option>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="attendant">Attendant</option>
            <option value="driver">Driver</option>
            <option value="customer">Customer</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Filter
          </button>
          {(search || roleFilter !== "all") && (
            <Link
              href="/admin/users"
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
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Login</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">
                    {user.firstName || user.lastName
                      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={roleBadgeVariant(user.role)}>
                      {user.role.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.tenant ? (
                      <Link
                        href={`/admin/tenants/${user.tenant.id}`}
                        className="text-primary hover:underline"
                      >
                        {user.tenant.businessName}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Platform</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? "success" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.lastLoginAt
                      ? formatDistanceToNow(user.lastLoginAt, { addSuffix: true })
                      : "Never"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDistanceToNow(user.createdAt, { addSuffix: true })}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No users found.
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
                href={`/admin/users?page=${page - 1}&search=${search}&role=${roleFilter}`}
              >
                <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                  Previous
                </button>
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/users?page=${page + 1}&search=${search}&role=${roleFilter}`}
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
