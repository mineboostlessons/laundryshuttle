"use server";

import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import prisma from "@/lib/prisma";

export async function getServiceAreaInterests() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  try {
    const interests = await prisma.serviceAreaInterest.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        addressLine1: true,
        city: true,
        state: true,
        zip: true,
        createdAt: true,
        notifiedAt: true,
      },
    });

    return interests;
  } catch (error) {
    // Table may not exist if db:push hasn't been run
    console.error("Failed to fetch service area interests:", error);
    return [];
  }
}

export async function deleteInterest(id: string) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  try {
    // Verify ownership
    const interest = await prisma.serviceAreaInterest.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!interest) {
      return { success: false, error: "Not found" };
    }

    await prisma.serviceAreaInterest.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete interest:", error);
    return { success: false, error: "Failed to delete" };
  }
}

export async function exportInterestsCsv() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  try {
    const interests = await prisma.serviceAreaInterest.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
    });

    const header = "Email,Address,City,State,ZIP,Date";
    const rows = interests.map((i) =>
      [
        i.email,
        `"${i.addressLine1}"`,
        i.city,
        i.state,
        i.zip,
        i.createdAt.toISOString().split("T")[0],
      ].join(",")
    );

    return [header, ...rows].join("\n");
  } catch (error) {
    console.error("Failed to export interests:", error);
    return "Email,Address,City,State,ZIP,Date";
  }
}
