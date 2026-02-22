import type { TextBlock } from "@/types/blocks";

export function TextBlockComponent({ block }: { block: TextBlock }) {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        {block.heading && (
          <h2 className="mb-6 text-3xl font-bold text-foreground">
            {block.heading}
          </h2>
        )}
        {block.body && (
          <div className="prose prose-lg max-w-none text-muted-foreground">
            {block.body.split("\n").map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
