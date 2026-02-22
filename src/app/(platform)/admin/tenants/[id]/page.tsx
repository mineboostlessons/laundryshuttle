import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { TenantEditForm } from "./tenant-edit-form";
import { TenantStatusToggle } from "./tenant-status-toggle";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TenantDetailPage({ params }: PageProps) {
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      _count: {
        select: { users: true, orders: true, laundromats: true, services: true },
      },
      laundromats: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          isActive: true,
          numWashers: true,
          numDryers: true,
        },
      },
      users: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!tenant) notFound();

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/tenants" className="hover:text-foreground">
          Tenants
        </Link>
        <span>/</span>
        <span className="text-foreground">{tenant.businessName}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tenant.businessName}</h1>
          <p className="text-muted-foreground">
            {tenant.slug}.laundryshuttle.com
            {tenant.customDomain && ` | ${tenant.customDomain}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={tenant.isActive ? "success" : "destructive"}>
            {tenant.isActive ? "Active" : "Inactive"}
          </Badge>
          <TenantStatusToggle tenantId={tenant.id} isActive={tenant.isActive} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Edit form */}
        <div className="lg:col-span-2">
          <TenantEditForm tenant={tenant} />
        </div>

        {/* Right column: Stats & Info */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">Overview</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Locations</p>
                <p className="text-xl font-bold">{tenant._count.laundromats}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Users</p>
                <p className="text-xl font-bold">{tenant._count.users}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Services</p>
                <p className="text-xl font-bold">{tenant._count.services}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Orders</p>
                <p className="text-xl font-bold">{tenant._count.orders}</p>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">Subscription</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="capitalize">{tenant.subscriptionPlan}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge
                    variant={
                      tenant.subscriptionStatus === "active"
                        ? "success"
                        : tenant.subscriptionStatus === "trialing"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {tenant.subscriptionStatus}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Platform Fee</dt>
                <dd>{(tenant.platformFeePercent * 100).toFixed(1)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Setup Fee</dt>
                <dd>{tenant.setupFeePaid ? "Paid" : "Unpaid"}</dd>
              </div>
            </dl>
          </div>

          {/* Dates */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">Dates</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{format(tenant.createdAt, "MMM d, yyyy")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{format(tenant.updatedAt, "MMM d, yyyy")}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Locations */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">
          Locations ({tenant.laundromats.length})
        </h2>
        {tenant.laundromats.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {tenant.laundromats.map((loc) => (
              <div key={loc.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{loc.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {loc.address}, {loc.city}, {loc.state} {loc.zip}
                    </p>
                  </div>
                  <Badge variant={loc.isActive ? "success" : "secondary"}>
                    {loc.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span>{loc.numWashers} washers</span>
                  <span>{loc.numDryers} dryers</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No locations yet.</p>
        )}
      </div>

      <Separator className="my-8" />

      {/* Users */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          Users ({tenant._count.users})
        </h2>
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {tenant.users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">
                        {user.role.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.isActive ? "success" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.lastLoginAt
                        ? format(user.lastLoginAt, "MMM d, yyyy h:mm a")
                        : "Never"}
                    </td>
                  </tr>
                ))}
                {tenant.users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No users.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
