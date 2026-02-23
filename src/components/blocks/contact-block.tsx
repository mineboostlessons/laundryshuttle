import prisma from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { formatPhone } from "@/lib/utils";
import type { ContactBlock } from "@/types/blocks";

export async function ContactBlockComponent({ block }: { block: ContactBlock }) {
  const tenant = await getCurrentTenant();
  const fullTenant = tenant
    ? await prisma.tenant.findUnique({
        where: { id: tenant.id },
        select: { phone: true, email: true },
      })
    : null;

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-heading mb-3 text-center text-3xl text-foreground">
          {block.heading}
        </h2>
        {block.subheading && (
          <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">
            {block.subheading}
          </p>
        )}

        <div className="grid gap-8 sm:grid-cols-2">
          {/* Contact info */}
          <div className="space-y-4">
            {block.showPhone && fullTenant?.phone && (
              <div>
                <h3 className="mb-1 text-sm font-semibold text-foreground">Phone</h3>
                <a href={`tel:${fullTenant.phone}`} className="text-sm text-primary hover:underline">
                  {formatPhone(fullTenant.phone)}
                </a>
              </div>
            )}
            {block.showEmail && fullTenant?.email && (
              <div>
                <h3 className="mb-1 text-sm font-semibold text-foreground">Email</h3>
                <a href={`mailto:${fullTenant.email}`} className="text-sm text-primary hover:underline">
                  {fullTenant.email}
                </a>
              </div>
            )}
          </div>

          {/* Contact form */}
          {block.showForm && (
            <div className="rounded-lg border border-border bg-card p-6">
              <form className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Name</label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Message</label>
                  <textarea
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="How can we help?"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  style={{ borderRadius: "var(--button-radius)" }}
                >
                  Send Message
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
