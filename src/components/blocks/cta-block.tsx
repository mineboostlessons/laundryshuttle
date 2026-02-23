import Link from "next/link";
import type { CtaBlock } from "@/types/blocks";

export function CtaBlockComponent({ block }: { block: CtaBlock }) {
  return (
    <section className="bg-primary/5 px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl text-foreground">{block.heading}</h2>
        {block.subheading && (
          <p className="mt-3 text-lg text-muted-foreground">
            {block.subheading}
          </p>
        )}
        <div className="mt-8">
          <Link
            href={block.buttonLink || "/order"}
            className="inline-flex items-center bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            style={{ borderRadius: "var(--button-radius)" }}
          >
            {block.buttonText}
          </Link>
        </div>
      </div>
    </section>
  );
}
