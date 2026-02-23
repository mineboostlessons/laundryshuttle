import Link from "next/link";
import type { HeroBlock } from "@/types/blocks";
import { HomepageAddressChecker } from "@/app/(tenant)/components/homepage-address-checker";

export function HeroBlockComponent({ block }: { block: HeroBlock }) {
  return (
    <section
      className="relative flex min-h-[420px] items-center justify-center px-6 py-24 text-center"
      style={
        block.backgroundImage
          ? {
              backgroundImage: `url(${block.backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { background: "var(--hero-gradient)" }
      }
    >
      {block.showGradient && (
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom right, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.6))" }}
        />
      )}
      {block.backgroundImage && !block.showGradient && (
        <div className="absolute inset-0 bg-black/40" />
      )}
      <div className="relative z-10 mx-auto max-w-3xl">
        <h1
          className={`font-heading text-4xl sm:text-5xl lg:text-6xl ${
            block.showGradient || block.backgroundImage
              ? "text-white"
              : "text-foreground"
          }`}
        >
          {block.heading}
        </h1>
        {block.subheading && (
          <p
            className={`mx-auto mt-4 max-w-2xl text-lg sm:text-xl ${
              block.showGradient || block.backgroundImage
                ? "text-white/90"
                : "text-muted-foreground"
            }`}
          >
            {block.subheading}
          </p>
        )}
        {block.showAddressChecker ? (
          <div className="mt-8">
            <HomepageAddressChecker />
          </div>
        ) : block.ctaText ? (
          <div className="mt-8">
            <Link
              href={block.ctaLink || "/order"}
              className={`inline-flex items-center px-8 py-3 text-lg font-semibold transition-colors ${
                block.showGradient || block.backgroundImage
                  ? "bg-white text-primary hover:bg-white/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
              style={{ borderRadius: "var(--button-radius)" }}
            >
              {block.ctaText}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
