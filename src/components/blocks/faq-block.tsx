import type { FaqBlock } from "@/types/blocks";

export function FaqBlockComponent({ block }: { block: FaqBlock }) {
  if (!block.items || block.items.length === 0) return null;

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-10 text-center text-3xl font-bold text-foreground">
          {block.heading}
        </h2>
        <div className="space-y-3">
          {block.items.map((item, i) => (
            <details
              key={i}
              className="group rounded-lg border bg-card"
            >
              <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-medium text-card-foreground">
                {item.question}
                <svg
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </summary>
              <div className="border-t px-6 py-4 text-muted-foreground">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
