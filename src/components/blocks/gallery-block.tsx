import Image from "next/image";
import type { GalleryBlock } from "@/types/blocks";

export function GalleryBlockComponent({ block }: { block: GalleryBlock }) {
  if (!block.images || block.images.length === 0) return null;

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading mb-10 text-center text-3xl text-foreground">
          {block.heading}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {block.images.map((img, i) => (
            <div key={i} className="group overflow-hidden rounded-lg border border-border">
              <div className="relative aspect-[4/3]">
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              {img.caption && (
                <p className="bg-card p-3 text-sm text-muted-foreground">{img.caption}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
