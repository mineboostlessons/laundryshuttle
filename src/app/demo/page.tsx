import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { DemoLanding } from "./demo-landing";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Demo — Laundry Shuttle",
  description:
    "Try Laundry Shuttle free with a live demo. Explore the owner dashboard, customer ordering, driver routes, POS, and more.",
};

export default async function DemoPage() {
  // Find the demo tenant
  const demoTenant = await prisma.tenant.findFirst({
    where: { isDemo: true, isActive: true },
    select: {
      id: true,
      slug: true,
      businessName: true,
      themePreset: true,
    },
  });

  // Fallback: look for slug "demo"
  const tenant =
    demoTenant ??
    (await prisma.tenant.findUnique({
      where: { slug: "demo" },
      select: {
        id: true,
        slug: true,
        businessName: true,
        themePreset: true,
      },
    }));

  if (!tenant) {
    redirect("/");
  }

  // Get demo role accounts
  const demoUsers = await prisma.user.findMany({
    where: {
      tenantId: tenant.id,
      email: { endsWith: "@demo.laundryshuttle.com" },
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
    },
    orderBy: { role: "asc" },
  });

  return (
    <DemoLanding
      tenantSlug={tenant.slug}
      businessName={tenant.businessName}
      demoUsers={demoUsers.map((u) => ({
        role: u.role,
        email: u.email,
        name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
      }))}
    />
  );
}
