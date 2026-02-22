"use server";

import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import prisma from "@/lib/prisma";

export async function getAllMigrationLogs() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  return prisma.migrationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      tenant: { select: { businessName: true, slug: true } },
    },
  });
}

export async function getMigrationStats() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  const [totalMigrations, completedMigrations, failedMigrations, totalRecordsImported] =
    await Promise.all([
      prisma.migrationLog.count(),
      prisma.migrationLog.count({ where: { status: "completed" } }),
      prisma.migrationLog.count({ where: { status: "failed" } }),
      prisma.migrationLog.aggregate({
        _sum: { successCount: true },
      }),
    ]);

  // Tenants that have used migration tools
  const tenantsWithMigrations = await prisma.migrationLog.groupBy({
    by: ["tenantId"],
    _count: { id: true },
  });

  return {
    totalMigrations,
    completedMigrations,
    failedMigrations,
    totalRecordsImported: totalRecordsImported._sum.successCount ?? 0,
    tenantsWithMigrations: tenantsWithMigrations.length,
  };
}
