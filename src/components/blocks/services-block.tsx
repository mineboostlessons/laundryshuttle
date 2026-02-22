import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { formatCurrency } from "@/lib/utils";
import type { ServicesBlock } from "@/types/blocks";

export async function ServicesBlockComponent({ block }: { block: ServicesBlock }) {
  const tenant = await requireTenant();
  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  if (services.length === 0) return null;

  return (
    <section className="bg-muted/30 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-10 text-center text-3xl font-bold text-foreground">
          {block.heading}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {service.category.replace(/_/g, " ")}
              </div>
              <h3 className="text-lg font-semibold text-card-foreground">
                {service.name}
              </h3>
              {service.description && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {service.description}
                </p>
              )}
              {block.showPrices && (
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(service.price)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{service.pricingType.replace(/_/g, " ")}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
