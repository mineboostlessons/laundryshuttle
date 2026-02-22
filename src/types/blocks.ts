// =============================================================================
// Page Builder — Block Type Definitions
// =============================================================================

export interface HeroBlock {
  type: "hero";
  heading: string;
  subheading: string;
  ctaText: string;
  ctaLink: string;
  backgroundImage?: string;
  showGradient: boolean;
}

export interface TextBlock {
  type: "text";
  heading?: string;
  body: string;
}

export interface ServicesBlock {
  type: "services";
  heading: string;
  showPrices: boolean;
}

export interface FeaturesBlock {
  type: "features";
  heading: string;
  features: Array<{
    icon: FeatureIcon;
    title: string;
    description: string;
  }>;
}

export interface CtaBlock {
  type: "cta";
  heading: string;
  subheading?: string;
  buttonText: string;
  buttonLink: string;
}

export interface FaqBlock {
  type: "faq";
  heading: string;
  items: Array<{
    question: string;
    answer: string;
  }>;
}

export type PageBlock =
  | HeroBlock
  | TextBlock
  | ServicesBlock
  | FeaturesBlock
  | CtaBlock
  | FaqBlock;

export type BlockType = PageBlock["type"];

export type FeatureIcon =
  | "truck"
  | "clock"
  | "sparkles"
  | "shield"
  | "phone"
  | "dollar";

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  hero: "Hero Banner",
  text: "Text Content",
  services: "Services Grid",
  features: "Features",
  cta: "Call to Action",
  faq: "FAQ",
};

export function createDefaultBlock(type: BlockType): PageBlock {
  switch (type) {
    case "hero":
      return {
        type: "hero",
        heading: "Welcome",
        subheading: "Professional laundry services at your doorstep.",
        ctaText: "Order Now",
        ctaLink: "/order",
        showGradient: true,
      };
    case "text":
      return {
        type: "text",
        heading: "",
        body: "",
      };
    case "services":
      return {
        type: "services",
        heading: "Our Services",
        showPrices: true,
      };
    case "features":
      return {
        type: "features",
        heading: "Why Choose Us",
        features: [
          {
            icon: "truck",
            title: "Free Pickup & Delivery",
            description: "We come to you. Schedule a pickup and we handle the rest.",
          },
          {
            icon: "clock",
            title: "Fast Turnaround",
            description: "Get your clothes back fresh and clean within 24 hours.",
          },
          {
            icon: "sparkles",
            title: "Professional Care",
            description: "Expert cleaning for all fabric types and garments.",
          },
        ],
      };
    case "cta":
      return {
        type: "cta",
        heading: "Ready to get started?",
        subheading: "Schedule your first pickup today.",
        buttonText: "Order Now",
        buttonLink: "/order",
      };
    case "faq":
      return {
        type: "faq",
        heading: "Frequently Asked Questions",
        items: [
          {
            question: "How does pickup work?",
            answer: "Schedule a pickup time and our driver will come to your door.",
          },
          {
            question: "How long does it take?",
            answer: "Standard turnaround is 24-48 hours from pickup.",
          },
        ],
      };
  }
}
