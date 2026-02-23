import type { ServiceAreasBlock } from "@/types/blocks";
import { HomepageAddressChecker } from "@/app/(tenant)/components/homepage-address-checker";
import prisma from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";

export async function ServiceAreasBlockComponent({ block }: { block: ServiceAreasBlock }) {
  const tenant = await getCurrentTenant();
  const locations = tenant
    ? await prisma.laundromat.findMany({
        where: { tenantId: tenant.id, isActive: true },
        select: { name: true, city: true, state: true, zip: true },
      })
    : [];

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="font-heading mb-3 text-center text-3xl text-foreground">
          {block.heading}
        </h2>
        {block.subheading && (
          <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">
            {block.subheading}
          </p>
        )}

        {block.showZipChecker && (
          <div className="mb-10">
            <HomepageAddressChecker />
          </div>
        )}

        {locations.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((loc, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-5"
                style={{ boxShadow: "var(--card-shadow)" }}
              >
                <h3 className="font-semibold text-foreground">{loc.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {loc.city}, {loc.state} {loc.zip}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
