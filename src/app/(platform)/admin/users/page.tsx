import Link from "next/link";
import prisma from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    role?: string;
    tenant?: string;
    status?: string;
    loginFrom?: string;
    loginTo?: string;
    joinedFrom?: string;
    joinedTo?: string;
    page?: string;
  }>;
}

export default async function UsersListPage({ searchParams }: PageProps) {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const params = await searchParams;
  const search = params.search || "";
  const roleFilter = params.role || "all";
  const tenantFilter = params.tenant || "all";
  const statusFilter = params.status || "all";
  const loginFrom = params.loginFrom || "";
  const loginTo = params.loginTo || "";
  const joinedFrom = params.joinedFrom || "";
  const joinedTo = params.joinedTo || "";
  const page = parseInt(params.page || "1", 10);
  const limit = 20;

  // Build where clause
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
  if (tenantFilter === "platform") {
    where.tenantId = null;
  } else if (tenantFilter !== "all") {
    where.tenantId = tenantFilter;
  }
  if (statusFilter !== "all") {
    where.isActive = statusFilter === "active";
  }
  if (loginFrom || loginTo) {
    const loginCondition: Record<string, Date> = {};
    if (loginFrom) loginCondition.gte = new Date(loginFrom);
    if (loginTo) {
      const end = new Date(loginTo);
      end.setHours(23, 59, 59, 999);
      loginCondition.lte = end;
    }
    where.lastLoginAt = loginCondition;
  }
  if (joinedFrom || joinedTo) {
    const joinedCondition: Record<string, Date> = {};
    if (joinedFrom) joinedCondition.gte = new Date(joinedFrom);
    if (joinedTo) {
      const end = new Date(joinedTo);
      end.setHours(23, 59, 59, 999);
      joinedCondition.lte = end;
    }
    where.createdAt = joinedCondition;
  }

  const [users, total, tenants] = await Promise.all([
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
    prisma.tenant.findMany({
      where: { isActive: true },
      orderBy: { businessName: "asc" },
      select: { id: true, businessName: true },
    }),
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

  const hasFilters = search || roleFilter !== "all" || tenantFilter !== "all" ||
    statusFilter !== "all" || loginFrom || loginTo || joinedFrom || joinedTo;

  // Build query string for pagination links
  const filterParams = new URLSearchParams();
  if (search) filterParams.set("search", search);
  if (roleFilter !== "all") filterParams.set("role", roleFilter);
  if (tenantFilter !== "all") filterParams.set("tenant", tenantFilter);
  if (statusFilter !== "all") filterParams.set("status", statusFilter);
  if (loginFrom) filterParams.set("loginFrom", loginFrom);
  if (loginTo) filterParams.set("loginTo", loginTo);
  if (joinedFrom) filterParams.set("joinedFrom", joinedFrom);
  if (joinedTo) filterParams.set("joinedTo", joinedTo);
  const filterString = filterParams.toString();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">
          {total} user{total !== 1 ? "s" : ""} across all tenants
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
              placeholder="Name or email..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Role */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Role</label>
            <select
              name="role"
              defaultValue={roleFilter}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Roles</option>
              <option value="platform_admin">Platform Admin</option>
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="attendant">Attendant</option>
              <option value="driver">Driver</option>
              <option value="customer">Customer</option>
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
              <option value="platform">Platform (no tenant)</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.businessName}</option>
              ))}
            </select>
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Last Login From */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Last Login From</label>
            <input
              type="date"
              name="loginFrom"
              defaultValue={loginFrom}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Last Login To */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Last Login To</label>
            <input
              type="date"
              name="loginTo"
              defaultValue={loginTo}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Joined From */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Joined From</label>
            <input
              type="date"
              name="joinedFrom"
              defaultValue={joinedFrom}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Joined To */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Joined To</label>
            <input
              type="date"
              name="joinedTo"
              defaultValue={joinedTo}
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
              href="/admin/users"
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
                    {user.lastLoginAt ? (
                      <span title={format(user.lastLoginAt, "MMM d, yyyy h:mm a")}>
                        {formatDistanceToNow(user.lastLoginAt, { addSuffix: true })}
                      </span>
                    ) : (
                      "Never"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span title={format(user.createdAt, "MMM d, yyyy h:mm a")}>
                      {formatDistanceToNow(user.createdAt, { addSuffix: true })}
                    </span>
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
                href={`/admin/users?page=${page - 1}${filterString ? `&${filterString}` : ""}`}
              >
                <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                  Previous
                </button>
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/users?page=${page + 1}${filterString ? `&${filterString}` : ""}`}
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
