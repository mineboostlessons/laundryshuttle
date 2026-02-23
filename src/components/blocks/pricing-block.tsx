import type { PricingBlock } from "@/types/blocks";

export function PricingBlockComponent({ block }: { block: PricingBlock }) {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading mb-3 text-center text-3xl text-foreground">
          {block.heading}
        </h2>
        {block.subheading && (
          <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">
            {block.subheading}
          </p>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {block.tiers.map((tier, i) => (
            <div
              key={i}
              className={`rounded-xl border p-8 text-center transition-shadow hover:shadow-lg ${
                tier.featured
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card"
              }`}
              style={{ boxShadow: "var(--card-shadow)" }}
            >
              {tier.featured && (
                <span className="mb-4 inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{tier.name}</h3>
              <div className="mt-4 flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                <span className="text-sm text-muted-foreground">{tier.unit}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{tier.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
