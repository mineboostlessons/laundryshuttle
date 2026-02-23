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
  showAddressChecker?: boolean;
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

export interface PricingBlock {
  type: "pricing";
  heading: string;
  subheading?: string;
  tiers: Array<{
    name: string;
    price: string;
    unit: string;
    description: string;
    featured?: boolean;
  }>;
}

export interface HowItWorksBlock {
  type: "how_it_works";
  heading: string;
  steps: Array<{
    title: string;
    description: string;
    icon: FeatureIcon;
  }>;
}

export interface TestimonialsBlock {
  type: "testimonials";
  heading: string;
  testimonials: Array<{
    name: string;
    text: string;
    rating: number;
  }>;
}

export interface ContactBlock {
  type: "contact";
  heading: string;
  subheading?: string;
  showPhone: boolean;
  showEmail: boolean;
  showForm: boolean;
}

export interface ServiceAreasBlock {
  type: "service_areas";
  heading: string;
  subheading?: string;
  showZipChecker: boolean;
}

export interface GalleryBlock {
  type: "gallery";
  heading: string;
  images: Array<{
    url: string;
    alt: string;
    caption?: string;
  }>;
}

export type PageBlock =
  | HeroBlock
  | TextBlock
  | ServicesBlock
  | FeaturesBlock
  | CtaBlock
  | FaqBlock
  | PricingBlock
  | HowItWorksBlock
  | TestimonialsBlock
  | ContactBlock
  | ServiceAreasBlock
  | GalleryBlock;

export type BlockType = PageBlock["type"];

export type FeatureIcon =
  | "truck"
  | "clock"
  | "sparkles"
  | "shield"
  | "phone"
  | "dollar"
  | "map"
  | "calendar"
  | "leaf"
  | "heart";

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  hero: "Hero Banner",
  text: "Text Content",
  services: "Services Grid",
  features: "Features",
  cta: "Call to Action",
  faq: "FAQ",
  pricing: "Pricing Table",
  how_it_works: "How It Works",
  testimonials: "Testimonials",
  contact: "Contact",
  service_areas: "Service Areas",
  gallery: "Image Gallery",
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
    case "pricing":
      return {
        type: "pricing",
        heading: "Our Pricing",
        tiers: [
          { name: "Wash & Fold", price: "$1.99", unit: "/lb", description: "24-hour turnaround" },
          { name: "Dry Cleaning", price: "$6.99", unit: "/item", description: "Professional pressing included" },
        ],
      };
    case "how_it_works":
      return {
        type: "how_it_works",
        heading: "How It Works",
        steps: [
          { title: "Schedule", description: "Book a pickup online.", icon: "calendar" },
          { title: "We Pick Up", description: "Our driver arrives at your door.", icon: "truck" },
          { title: "Clean & Deliver", description: "We clean and deliver back to you.", icon: "sparkles" },
        ],
      };
    case "testimonials":
      return {
        type: "testimonials",
        heading: "What Our Customers Say",
        testimonials: [
          { name: "Jane D.", text: "Amazing service! My clothes always come back perfectly clean.", rating: 5 },
        ],
      };
    case "contact":
      return {
        type: "contact",
        heading: "Contact Us",
        subheading: "We'd love to hear from you.",
        showPhone: true,
        showEmail: true,
        showForm: true,
      };
    case "service_areas":
      return {
        type: "service_areas",
        heading: "Service Areas",
        subheading: "Check if we deliver to your area.",
        showZipChecker: true,
      };
    case "gallery":
      return {
        type: "gallery",
        heading: "Gallery",
        images: [],
      };
  }
}
