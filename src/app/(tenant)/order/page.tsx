import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth-helpers";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantFooter } from "@/components/tenant/tenant-footer";
import { OrderFlow } from "./order-flow";
import { getAvailableTimeSlots } from "./actions";

export const metadata: Metadata = {
  title: "Place an Order",
};

export default async function OrderPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  const session = await getSession();

  const [services, timeSlots] = await Promise.all([
    prisma.service.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        pricingType: true,
        price: true,
        icon: true,
      },
    }),
    getAvailableTimeSlots(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <TenantHeader />
      <main className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <h1 className="text-3xl font-bold text-foreground">
            Place an Order
          </h1>
          <p className="mt-2 text-muted-foreground">
            Schedule a pickup and we&apos;ll handle the rest.
          </p>
          <div className="mt-8">
            <OrderFlow
              services={services}
              timeSlots={timeSlots}
              tenantSlug={tenant.slug}
            />
          </div>
        </div>
      </main>
      <TenantFooter />
    </div>
  );
}
