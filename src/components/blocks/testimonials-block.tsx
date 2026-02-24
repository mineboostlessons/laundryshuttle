import type { TestimonialsBlock } from "@/types/blocks";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${star <= rating ? "text-accent" : "text-muted"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialsBlockComponent({ block }: { block: TestimonialsBlock }) {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading mb-10 text-center text-3xl text-foreground">
          {block.heading}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {block.testimonials.map((item, i) => (
            <div
              key={i}
              className="relative rounded-xl border border-border bg-card p-6 pt-8"
              style={{ boxShadow: "var(--card-shadow)" }}
            >
              <span className="absolute -top-3 left-5 text-5xl font-serif leading-none text-primary/20" aria-hidden="true">
                &ldquo;
              </span>
              <StarRating rating={item.rating} />
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                &ldquo;{item.text}&rdquo;
              </p>
              <p className="mt-4 text-sm font-semibold text-foreground">{item.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
