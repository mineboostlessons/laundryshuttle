import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth-helpers";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantFooter } from "@/components/tenant/tenant-footer";
import { OrderFlow } from "./order-flow";
import { getAvailableTimeSlots } from "./actions";
import { getOrderForReorder } from "../customer/actions";

export const metadata: Metadata = {
  title: "Place an Order",
};

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ reorder?: string }>;
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  const session = await getSession();
  const params = await searchParams;

  // Fetch reorder data if requested
  let reorderData: Awaited<ReturnType<typeof getOrderForReorder>> = null;
  if (params.reorder && session?.user?.id) {
    try {
      reorderData = await getOrderForReorder(params.reorder);
    } catch {
      // Ignore — user may not be logged in or order not found
    }
  }

  const [services, timeSlots] = await Promise.all([
    prisma.service.findMany({
      where: { tenantId: tenant.id, isActive: true, isSystem: true },
      orderBy: { sortOrder: "asc" },
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

  // Fetch saved addresses for logged-in customers
  let savedAddresses: {
    id: string;
    label: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    zip: string;
    lat: number | null;
    lng: number | null;
    isDefault: boolean;
    pickupNotes: string | null;
  }[] = [];

  if (session?.user?.id) {
    const allAddresses = await prisma.customerAddress.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        label: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        zip: true,
        lat: true,
        lng: true,
        isDefault: true,
        pickupNotes: true,
      },
    });

    // Deduplicate by addressLine1
    const seen = new Set<string>();
    savedAddresses = allAddresses.filter((addr) => {
      const key = addr.addressLine1.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

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
              savedAddresses={savedAddresses}
              reorderData={reorderData}
            />
          </div>
        </div>
      </main>
      <TenantFooter />
    </div>
  );
}
