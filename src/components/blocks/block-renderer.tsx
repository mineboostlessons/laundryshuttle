import type { PageBlock } from "@/types/blocks";
import { HeroBlockComponent } from "./hero-block";
import { TextBlockComponent } from "./text-block";
import { ServicesBlockComponent } from "./services-block";
import { FeaturesBlockComponent } from "./features-block";
import { CtaBlockComponent } from "./cta-block";
import { FaqBlockComponent } from "./faq-block";
import { PricingBlockComponent } from "./pricing-block";
import { HowItWorksBlockComponent } from "./how-it-works-block";
import { TestimonialsBlockComponent } from "./testimonials-block";
import { ContactBlockComponent } from "./contact-block";
import { ServiceAreasBlockComponent } from "./service-areas-block";
import { GalleryBlockComponent } from "./gallery-block";

export function BlockRenderer({ blocks }: { blocks: PageBlock[] }) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "hero":
            return <HeroBlockComponent key={index} block={block} />;
          case "text":
            return <TextBlockComponent key={index} block={block} />;
          case "services":
            return <ServicesBlockComponent key={index} block={block} />;
          case "features":
            return <FeaturesBlockComponent key={index} block={block} />;
          case "cta":
            return <CtaBlockComponent key={index} block={block} />;
          case "faq":
            return <FaqBlockComponent key={index} block={block} />;
          case "pricing":
            return <PricingBlockComponent key={index} block={block} />;
          case "how_it_works":
            return <HowItWorksBlockComponent key={index} block={block} />;
          case "testimonials":
            return <TestimonialsBlockComponent key={index} block={block} />;
          case "contact":
            return <ContactBlockComponent key={index} block={block} />;
          case "service_areas":
            return <ServiceAreasBlockComponent key={index} block={block} />;
          case "gallery":
            return <GalleryBlockComponent key={index} block={block} />;
          default:
            return null;
        }
      })}
    </>
  );
}
