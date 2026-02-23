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
          : undefined
      }
    >
      {block.showGradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/60" />
      )}
      {block.backgroundImage && !block.showGradient && (
        <div className="absolute inset-0 bg-black/40" />
      )}
      <div className="relative z-10 mx-auto max-w-3xl">
        <h1
          className={`text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl ${
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
              className={`inline-flex items-center rounded-lg px-8 py-3 text-lg font-semibold transition-colors ${
                block.showGradient || block.backgroundImage
                  ? "bg-white text-primary hover:bg-white/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {block.ctaText}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
