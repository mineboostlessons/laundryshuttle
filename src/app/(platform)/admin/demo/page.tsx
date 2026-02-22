import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import prisma from "@/lib/prisma";
import { DemoManagement } from "./demo-management";

export default async function AdminDemoPage() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  // Get all demo tenants
  const demoTenants = await prisma.tenant.findMany({
    where: {
      OR: [{ isDemo: true }, { slug: "demo" }],
    },
    include: {
      _count: {
        select: {
          users: true,
          orders: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get demo session stats
  const activeSessions = await prisma.demoSession.count({
    where: {
      expiresAt: { gt: new Date() },
    },
  });

  const totalSessions = await prisma.demoSession.count();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Demo Tenants</h1>
        <p className="text-sm text-muted-foreground">
          Manage demo tenants for prospect exploration
        </p>
      </div>

      <DemoManagement
        demoTenants={demoTenants.map((t) => ({
          id: t.id,
          slug: t.slug,
          businessName: t.businessName,
          isDemo: t.isDemo,
          isActive: t.isActive,
          demoResetInterval: t.demoResetInterval,
          userCount: t._count.users,
          orderCount: t._count.orders,
          createdAt: t.createdAt.toISOString(),
        }))}
        activeSessions={activeSessions}
        totalSessions={totalSessions}
      />
    </div>
  );
}
