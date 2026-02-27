"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const onboardingSchema = z.object({
  // Step 1: Business Info
  businessName: z.string().min(2, "Business name is required"),
  slug: z
    .string()
    .min(3, "URL slug must be at least 3 characters")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  businessType: z.enum(["laundromat", "dry_cleaner", "wash_and_fold", "combo"]),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email("Invalid email").optional().or(z.literal("")),

  // Step 2: Owner Account
  ownerFirstName: z.string().min(1, "First name is required"),
  ownerLastName: z.string().min(1, "Last name is required"),
  ownerEmail: z.string().email("Invalid email"),
  ownerPhone: z.string().optional(),
  ownerPassword: z.string().min(8, "Password must be at least 8 characters"),

  // Step 3: Location
  locationName: z.string().min(1, "Location name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required").max(2),
  zip: z.string().min(5, "ZIP code is required"),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  timezone: z.string().default("America/New_York"),
  numWashers: z.coerce.number().int().min(0).default(0),
  numDryers: z.coerce.number().int().min(0).default(0),

  // Step 4: Services
  serviceTemplate: z.enum(["standard", "premium", "minimal", "custom"]).default("standard"),

  // Step 5: Branding
  themePreset: z.enum(["clean_luxe", "fresh_wave", "eco_zen", "neon_express", "soft_cloud", "metro_editorial"]).default("clean_luxe"),
});

export type OnboardingState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  tenantSlug?: string;
};

const SERVICE_TEMPLATES: Record<
  string,
  Array<{
    category: string;
    name: string;
    description: string;
    pricingType: string;
    price: number;
    sortOrder: number;
  }>
> = {
  standard: [
    {
      category: "wash_and_fold",
      name: "Wash & Fold - Regular",
      description: "Standard wash and fold. Sorted, washed, dried, and neatly folded.",
      pricingType: "per_pound",
      price: 1.99,
      sortOrder: 1,
    },
    {
      category: "wash_and_fold",
      name: "Wash & Fold - Delicate",
      description: "Gentle cycle for delicate fabrics.",
      pricingType: "per_pound",
      price: 2.99,
      sortOrder: 2,
    },
    {
      category: "dry_cleaning",
      name: "Dry Cleaning - Shirts",
      description: "Professional dry cleaning for dress shirts.",
      pricingType: "per_item",
      price: 4.99,
      sortOrder: 3,
    },
    {
      category: "dry_cleaning",
      name: "Dry Cleaning - Suits",
      description: "Full suit dry cleaning.",
      pricingType: "per_item",
      price: 14.99,
      sortOrder: 4,
    },
    {
      category: "specialty",
      name: "Comforter / Bedding",
      description: "Large item cleaning for comforters and blankets.",
      pricingType: "per_item",
      price: 24.99,
      sortOrder: 5,
    },
  ],
  premium: [
    {
      category: "wash_and_fold",
      name: "Wash & Fold - Regular",
      description: "Standard wash and fold service.",
      pricingType: "per_pound",
      price: 2.49,
      sortOrder: 1,
    },
    {
      category: "wash_and_fold",
      name: "Wash & Fold - Delicate",
      description: "Gentle cycle for delicate fabrics.",
      pricingType: "per_pound",
      price: 3.49,
      sortOrder: 2,
    },
    {
      category: "wash_and_fold",
      name: "Wash & Fold - Express (Same Day)",
      description: "Same-day wash and fold with priority processing.",
      pricingType: "per_pound",
      price: 3.99,
      sortOrder: 3,
    },
    {
      category: "dry_cleaning",
      name: "Dry Cleaning - Shirts",
      description: "Professional dry cleaning for shirts and blouses.",
      pricingType: "per_item",
      price: 5.99,
      sortOrder: 4,
    },
    {
      category: "dry_cleaning",
      name: "Dry Cleaning - Suits",
      description: "Full suit dry cleaning.",
      pricingType: "per_item",
      price: 17.99,
      sortOrder: 5,
    },
    {
      category: "dry_cleaning",
      name: "Dry Cleaning - Dresses / Gowns",
      description: "Special care for dresses and formal gowns.",
      pricingType: "per_item",
      price: 19.99,
      sortOrder: 6,
    },
    {
      category: "specialty",
      name: "Comforter / Bedding",
      description: "Large item cleaning for comforters and blankets.",
      pricingType: "per_item",
      price: 29.99,
      sortOrder: 7,
    },
    {
      category: "specialty",
      name: "Leather / Suede Cleaning",
      description: "Professional cleaning for leather and suede items.",
      pricingType: "per_item",
      price: 39.99,
      sortOrder: 8,
    },
  ],
  minimal: [
    {
      category: "wash_and_fold",
      name: "Wash & Fold",
      description: "Standard wash and fold service.",
      pricingType: "per_pound",
      price: 1.79,
      sortOrder: 1,
    },
    {
      category: "specialty",
      name: "Large Items",
      description: "Comforters, blankets, and other large items.",
      pricingType: "per_item",
      price: 19.99,
      sortOrder: 2,
    },
  ],
  custom: [],
};

const DEFAULT_OPERATING_HOURS = {
  monday: { open: "07:00", close: "21:00" },
  tuesday: { open: "07:00", close: "21:00" },
  wednesday: { open: "07:00", close: "21:00" },
  thursday: { open: "07:00", close: "21:00" },
  friday: { open: "07:00", close: "21:00" },
  saturday: { open: "08:00", close: "20:00" },
  sunday: { open: "08:00", close: "18:00" },
};

export async function checkSlugAvailability(slug: string): Promise<boolean> {
  const existing = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  return !existing;
}

export async function submitOnboarding(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = onboardingSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path[0] as string] = issue.message;
    }
    return { error: "Please fix the errors below.", fieldErrors };
  }

  const data = parsed.data;

  try {
    // Check slug availability
    const slugTaken = await prisma.tenant.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });
    if (slugTaken) {
      return {
        error: "This URL slug is already taken.",
        fieldErrors: { slug: "This URL slug is already taken" },
      };
    }

    // Check email availability
    const emailTaken = await prisma.user.findFirst({
      where: { email: data.ownerEmail, tenantId: null },
    });
    if (emailTaken) {
      return {
        error: "An account with this email already exists.",
        fieldErrors: { ownerEmail: "Email already registered" },
      };
    }

    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create tenant
      const tenant = await tx.tenant.create({
        data: {
          slug: data.slug,
          businessName: data.businessName,
          businessType: data.businessType,
          phone: data.businessPhone || null,
          email: data.businessEmail || null,
          themePreset: data.themePreset,
          subscriptionPlan: "standard",
          subscriptionStatus: "trialing",
          isActive: true,
          onboardingComplete: true,
          setupCompletenessScore: 60,
        },
      });

      // 2. Create owner user
      const passwordHash = await bcrypt.hash(data.ownerPassword, 12);
      await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: data.ownerEmail,
          firstName: data.ownerFirstName,
          lastName: data.ownerLastName,
          phone: data.ownerPhone || null,
          passwordHash,
          role: "owner",
          authProvider: "email",
          emailVerified: new Date(),
          isActive: true,
        },
      });

      // 3. Create location
      await tx.laundromat.create({
        data: {
          tenantId: tenant.id,
          name: data.locationName,
          address: data.address,
          city: data.city,
          state: data.state.toUpperCase(),
          zip: data.zip,
          lat: data.lat || 0,
          lng: data.lng || 0,
          timezone: data.timezone,
          numWashers: data.numWashers,
          numDryers: data.numDryers,
          isActive: true,
          operatingHours: DEFAULT_OPERATING_HOURS,
          pickupDays: ["monday", "wednesday", "friday"],
          deliveryDays: ["tuesday", "thursday", "saturday"],
          pickupTimeSlots: ["9am-12pm", "12pm-3pm", "3pm-6pm"],
          deliveryTimeSlots: ["9am-12pm", "12pm-3pm", "3pm-6pm"],
        },
      });

      // 4. Create services from template
      const services = SERVICE_TEMPLATES[data.serviceTemplate] || [];
      if (services.length > 0) {
        await tx.service.createMany({
          data: services.map((s) => ({ ...s, tenantId: tenant.id })),
        });
      }

      // 5. Create default CMS pages (9 pages matching demo tenant)
      const biz = data.businessName;
      const defaultPages = [
        {
          title: "Home",
          slug: "home",
          seoTitle: `${biz} — Professional Laundry Pickup & Delivery`,
          seoDescription: "Convenient laundry pickup and delivery services. We handle the dirty work so you can enjoy your free time.",
          sortOrder: 0,
          blocks: [
            {
              type: "hero",
              heading: "Professional Laundry, Delivered",
              subheading: `${biz} offers convenient pickup and delivery laundry services. We handle the dirty work so you can enjoy your free time.`,
              ctaText: "Schedule a Pickup",
              ctaLink: "/order",
              showGradient: false,
              showAddressChecker: true,
              backgroundImage: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=1600&q=80",
            },
            {
              type: "features",
              heading: "Why Choose Us",
              features: [
                { icon: "truck", title: "Free Pickup & Delivery", description: "We come to your door on your schedule. No minimum order required." },
                { icon: "clock", title: "24-Hour Turnaround", description: "Get your clothes back fresh and fast — most orders ready next day." },
                { icon: "sparkles", title: "Expert Care", description: "Professional cleaning for all fabrics using premium detergents." },
                { icon: "shield", title: "Satisfaction Guaranteed", description: "Not happy? We'll re-clean for free. Your satisfaction is our priority." },
              ],
            },
            { type: "services", heading: "Our Services", showPrices: true },
            {
              type: "cta",
              heading: "Ready to Get Started?",
              subheading: "Schedule your first pickup in minutes. No commitments, no hassle.",
              buttonText: "Schedule a Pickup",
              buttonLink: "/order",
            },
          ],
        },
        {
          title: "Wash & Fold",
          slug: "wash-and-fold",
          seoTitle: `Wash & Fold Laundry Service — ${biz}`,
          seoDescription: "Professional wash and fold service starting at $1.99/lb. Same-day and next-day turnaround available.",
          sortOrder: 1,
          blocks: [
            {
              type: "hero",
              heading: "Wash & Fold Service",
              subheading: "Let us handle your everyday laundry. Drop it off or schedule a pickup — we'll wash, dry, and fold it to perfection.",
              ctaText: "Order Now",
              ctaLink: "/order",
              showGradient: false,
              backgroundImage: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=1600&q=80",
            },
            {
              type: "text",
              heading: "How Our Wash & Fold Works",
              body: "Our wash and fold service is perfect for everyday laundry — clothes, towels, sheets, and more. We sort your laundry by color and fabric type, wash with premium detergent, tumble dry on the appropriate setting, and neatly fold everything. Each order is tagged and tracked from pickup to delivery.\n\nWe offer both regular and delicate cycles. Choose from several detergent options including hypoallergenic and eco-friendly alternatives. Special instructions? Just let us know in your order notes.",
            },
            {
              type: "pricing",
              heading: "Wash & Fold Pricing",
              subheading: "Simple, transparent pricing with no hidden fees.",
              tiers: [
                { name: "Regular Wash & Fold", price: "$1.99", unit: "/lb", description: "Standard cycle, 24-hour turnaround", featured: true },
                { name: "Delicate Wash & Fold", price: "$2.99", unit: "/lb", description: "Gentle cycle, cold water wash" },
                { name: "Same-Day Rush", price: "$3.49", unit: "/lb", description: "Picked up by 10am, delivered by 6pm" },
              ],
            },
            {
              type: "how_it_works",
              heading: "3 Easy Steps",
              steps: [
                { title: "Schedule a Pickup", description: "Choose a date and time that works for you. We'll send a driver to your door.", icon: "calendar" },
                { title: "We Clean Your Clothes", description: "Our team sorts, washes, dries, and folds your laundry with care.", icon: "sparkles" },
                { title: "We Deliver It Back", description: "Fresh, clean laundry delivered right back to your doorstep.", icon: "truck" },
              ],
            },
            {
              type: "faq",
              heading: "Wash & Fold FAQ",
              items: [
                { question: "What's the minimum order?", answer: "There's no minimum order for wash & fold. However, orders under 10 lbs are charged a flat $19.90 minimum." },
                { question: "Can I choose my detergent?", answer: "Yes! We offer Tide Original, hypoallergenic, fabric softener, and eco-friendly detergent options." },
                { question: "How do you handle stains?", answer: "We pre-treat visible stains before washing. For tough stains, add a note to your order and we'll give them extra attention." },
                { question: "Do you sort by color?", answer: "Absolutely. We sort all laundry by color and fabric type to prevent color bleeding and ensure proper care." },
              ],
            },
            {
              type: "cta",
              heading: "Try Our Wash & Fold Service",
              subheading: "First-time customers get 20% off with code WELCOME20.",
              buttonText: "Schedule a Pickup",
              buttonLink: "/order",
            },
          ],
        },
        {
          title: "Pickup & Delivery",
          slug: "pickup-and-delivery",
          seoTitle: `Laundry Pickup & Delivery Service — ${biz}`,
          seoDescription: "Free laundry pickup and delivery service. Schedule online, we handle the rest. Available 7 days a week.",
          sortOrder: 2,
          blocks: [
            {
              type: "hero",
              heading: "Free Pickup & Delivery",
              subheading: "We come to you. Schedule a pickup online, leave your laundry at the door, and we'll deliver it back fresh and clean.",
              ctaText: "Schedule Now",
              ctaLink: "/order",
              showGradient: false,
              backgroundImage: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1600&q=80",
            },
            {
              type: "how_it_works",
              heading: "How Pickup & Delivery Works",
              steps: [
                { title: "Schedule Online", description: "Pick a date, time slot, and leave any special instructions.", icon: "calendar" },
                { title: "We Pick Up", description: "Our driver arrives at your door. Just leave your bag outside or hand it off.", icon: "truck" },
                { title: "We Clean & Deliver", description: "Your laundry is professionally cleaned and delivered back within 24-48 hours.", icon: "sparkles" },
              ],
            },
            {
              type: "pricing",
              heading: "Delivery Pricing",
              tiers: [
                { name: "Free Delivery", price: "$0", unit: "", description: "On all orders over $25", featured: true },
                { name: "Standard Delivery", price: "$5.99", unit: "", description: "For orders under $25" },
                { name: "Same-Day Rush", price: "$9.99", unit: "", description: "Pickup by 10am, delivery by 6pm" },
              ],
            },
            {
              type: "text",
              heading: "Service Details",
              body: "Our pickup and delivery service is available Monday through Saturday. We offer morning (9am-12pm), afternoon (12pm-3pm), and evening (3pm-6pm) time slots.\n\nAll pickups include a free laundry bag for your first order. Just place your bag in a visible location — our drivers will text you when they arrive and when your order is on its way back.\n\nTracking is available in real time through your customer dashboard. You'll receive SMS and email notifications at every step.",
            },
            {
              type: "faq",
              heading: "Pickup & Delivery FAQ",
              items: [
                { question: "What areas do you serve?", answer: "Check our Service Areas page for details on our delivery coverage." },
                { question: "Do I need to be home for pickup?", answer: "No! Just leave your laundry bag in a visible, covered location. Our driver will text you upon pickup." },
                { question: "How do I track my order?", answer: "Log into your account to see real-time status updates. You'll also receive SMS notifications at each step." },
                { question: "What if I need to reschedule?", answer: "You can reschedule or cancel up to 2 hours before your scheduled pickup time through your dashboard." },
              ],
            },
            {
              type: "cta",
              heading: "Schedule Your First Pickup",
              subheading: "It takes less than 2 minutes. Free delivery on orders over $25.",
              buttonText: "Get Started",
              buttonLink: "/order",
            },
          ],
        },
        {
          title: "Dry Cleaning",
          slug: "dry-cleaning",
          seoTitle: `Dry Cleaning Service — ${biz}`,
          seoDescription: "Professional dry cleaning with free pickup and delivery. Shirts, suits, dresses, and specialty garments.",
          sortOrder: 3,
          blocks: [
            {
              type: "hero",
              heading: "Professional Dry Cleaning",
              subheading: "Expert care for your finest garments. We handle suits, dresses, silk, cashmere, and delicate fabrics with precision.",
              ctaText: "Schedule a Pickup",
              ctaLink: "/order",
              showGradient: false,
              backgroundImage: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1600&q=80",
            },
            {
              type: "text",
              heading: "Why Our Dry Cleaning Is Different",
              body: "We use state-of-the-art cleaning equipment and eco-friendly solvents to keep your garments looking their best. Every item is individually inspected, treated for stains, and pressed by hand.\n\nOur team has decades of combined experience handling everything from everyday business attire to wedding gowns and formal wear. We treat every garment as if it were our own.",
            },
            {
              type: "pricing",
              heading: "Dry Cleaning Pricing",
              subheading: "Competitive pricing with premium quality.",
              tiers: [
                { name: "Shirts & Blouses", price: "$4.99", unit: "/item", description: "Laundered and pressed" },
                { name: "Pants & Skirts", price: "$7.99", unit: "/item", description: "Dry cleaned and pressed" },
                { name: "Suits (2-piece)", price: "$14.99", unit: "/item", description: "Full dry clean and press", featured: true },
                { name: "Dresses", price: "$12.99", unit: "/item", description: "Dry cleaned and finished" },
                { name: "Coats & Jackets", price: "$16.99", unit: "/item", description: "Seasonal cleaning available" },
              ],
            },
            {
              type: "cta",
              heading: "Schedule Dry Cleaning Pickup",
              subheading: "Professional results, delivered to your door.",
              buttonText: "Order Now",
              buttonLink: "/order",
            },
          ],
        },
        {
          title: "Pricing",
          slug: "pricing",
          seoTitle: `Laundry Service Pricing — ${biz}`,
          seoDescription: "Transparent laundry service pricing. Wash & fold from $1.99/lb, dry cleaning from $4.99/item. No hidden fees.",
          sortOrder: 4,
          blocks: [
            {
              type: "hero",
              heading: "Simple, Transparent Pricing",
              subheading: "No hidden fees, no surprises. Just great laundry service at fair prices.",
              ctaText: "Order Now",
              ctaLink: "/order",
              showGradient: false,
              backgroundImage: "https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=1600&q=80",
            },
            {
              type: "pricing",
              heading: "Wash & Fold",
              tiers: [
                { name: "Regular Wash & Fold", price: "$1.99", unit: "/lb", description: "24-hour turnaround", featured: true },
                { name: "Delicate Wash & Fold", price: "$2.99", unit: "/lb", description: "Gentle cycle, cold water" },
                { name: "Same-Day Rush", price: "$3.49", unit: "/lb", description: "Pickup by 10am, delivery by 6pm" },
              ],
            },
            {
              type: "pricing",
              heading: "Dry Cleaning",
              tiers: [
                { name: "Shirts & Blouses", price: "$4.99", unit: "/item", description: "Laundered and pressed" },
                { name: "Suits (2-piece)", price: "$14.99", unit: "/item", description: "Full dry clean and press", featured: true },
                { name: "Dresses", price: "$12.99", unit: "/item", description: "Dry cleaned and finished" },
              ],
            },
            {
              type: "pricing",
              heading: "Specialty Items",
              tiers: [
                { name: "Comforter / Duvet", price: "$24.99", unit: "/item", description: "Large item cleaning" },
                { name: "Wedding Dress", price: "$149.99", unit: "/item", description: "Preservation available" },
                { name: "Leather / Suede", price: "$29.99", unit: "/item", description: "Specialty care" },
              ],
            },
            {
              type: "faq",
              heading: "Pricing FAQ",
              items: [
                { question: "Is there a minimum order?", answer: "No minimum for delivery orders over $25. Orders under $25 have a $5.99 delivery fee. Walk-in orders have no minimum." },
                { question: "Do you charge extra for detergent?", answer: "Our standard Tide detergent is included. Hypoallergenic (+$1.50) and eco-friendly (+$2.00) options are available." },
                { question: "Are there any hidden fees?", answer: "Never. What you see is what you pay. Tax is calculated at checkout based on your location." },
                { question: "Do you offer subscriptions?", answer: "Yes! We offer weekly and bi-weekly subscription plans with 15% savings. Ask us about setting up a recurring schedule." },
              ],
            },
          ],
        },
        {
          title: "About Us",
          slug: "about",
          seoTitle: `About Us — ${biz}`,
          seoDescription: `Learn about ${biz} — our story, our values, and our commitment to providing the best laundry service.`,
          sortOrder: 5,
          blocks: [
            {
              type: "hero",
              heading: `About ${biz}`,
              subheading: "A modern laundry service built on old-fashioned values: quality, care, and convenience.",
              ctaText: "",
              ctaLink: "",
              showGradient: false,
              backgroundImage: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&q=80",
            },
            {
              type: "text",
              heading: "Our Story",
              body: `${biz} was founded with a simple mission: to give people back their time. We believe doing laundry shouldn't be a chore — it should be effortless.\n\nWhat started as a small neighborhood service has grown into a full-service laundry operation serving customers across the area. We combine professional-grade equipment with a personal touch, ensuring every garment is treated with care.\n\nOur team is passionate about sustainability, using eco-friendly products whenever possible and reducing water waste through modern washing technology.`,
            },
            {
              type: "features",
              heading: "Our Values",
              features: [
                { icon: "heart", title: "Customer First", description: "Everything we do starts with the customer. Your satisfaction is our top priority." },
                { icon: "leaf", title: "Eco-Conscious", description: "We use eco-friendly detergents and energy-efficient equipment to minimize our footprint." },
                { icon: "shield", title: "Quality Guaranteed", description: "Every item is inspected before delivery. Not satisfied? We'll re-clean it for free." },
                { icon: "clock", title: "Reliability", description: "On-time pickups and deliveries, every single time. You can count on us." },
              ],
            },
            {
              type: "testimonials",
              heading: "What Our Customers Say",
              testimonials: [
                { name: "Sarah M.", text: "I've been using this service for 6 months now and I'll never go back to doing my own laundry. The quality is incredible.", rating: 5 },
                { name: "James R.", text: "Fast, reliable, and affordable. They handle my business shirts perfectly every time.", rating: 5 },
                { name: "Linda K.", text: "The pickup and delivery service is so convenient. I just leave my bag and it comes back perfectly folded.", rating: 5 },
              ],
            },
            {
              type: "cta",
              heading: "Join Thousands of Happy Customers",
              subheading: "Try us today and see the difference.",
              buttonText: "Schedule Your First Pickup",
              buttonLink: "/order",
            },
          ],
        },
        {
          title: "FAQ",
          slug: "faq",
          seoTitle: `Frequently Asked Questions — ${biz}`,
          seoDescription: "Answers to common questions about our laundry pickup & delivery service, pricing, turnaround times, and more.",
          sortOrder: 6,
          blocks: [
            {
              type: "hero",
              heading: "Frequently Asked Questions",
              subheading: "Everything you need to know about our laundry services.",
              ctaText: "",
              ctaLink: "",
              showGradient: false,
              backgroundImage: "https://images.unsplash.com/photo-1517677129300-07b130802f46?w=1600&q=80",
            },
            {
              type: "faq",
              heading: "General Questions",
              items: [
                { question: "How does the pickup and delivery service work?", answer: "Schedule a pickup through our website or app. Our driver will come to your location at the scheduled time, pick up your laundry, and deliver it back clean and folded within 24-48 hours." },
                { question: "What areas do you serve?", answer: "Check our Service Areas page or enter your address on our homepage to verify coverage." },
                { question: "What are your operating hours?", answer: "We're open Monday-Friday 7am-9pm, Saturday 8am-8pm, and Sunday 8am-6pm. Pickup and delivery slots are available during these hours." },
                { question: "Do I need to create an account?", answer: "Yes, creating a free account allows you to schedule pickups, track orders, save addresses, and manage payment methods." },
                { question: "What forms of payment do you accept?", answer: "We accept all major credit and debit cards. Payment is processed securely through Stripe." },
                { question: "How do I track my order?", answer: "Log into your account dashboard to see real-time status updates. You'll also receive SMS and email notifications at every stage." },
                { question: "What if an item is damaged or lost?", answer: "We take extreme care with every item. In the rare event something is damaged, we'll compensate you based on the item's value. Contact us immediately to file a claim." },
                { question: "Do you offer commercial or business accounts?", answer: "Yes! We offer commercial accounts for businesses with recurring laundry needs. Contact us for custom pricing and invoicing options." },
                { question: "Can I cancel or reschedule a pickup?", answer: "You can cancel or reschedule up to 2 hours before your scheduled pickup time through your account dashboard." },
                { question: "Do you use eco-friendly products?", answer: "Yes! We offer eco-friendly detergent options and use energy-efficient equipment. Just select the eco-friendly option when placing your order." },
              ],
            },
          ],
        },
        {
          title: "Service Areas",
          slug: "service-areas",
          seoTitle: `Service Areas — ${biz}`,
          seoDescription: `Check if ${biz} delivers to your area.`,
          sortOrder: 7,
          blocks: [
            {
              type: "hero",
              heading: "Our Service Areas",
              subheading: "Check if we deliver to your neighborhood.",
              ctaText: "",
              ctaLink: "",
              showGradient: false,
              backgroundImage: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1600&q=80",
            },
            {
              type: "service_areas",
              heading: "Do We Deliver to You?",
              subheading: "Enter your address below to check if you're within our delivery zone.",
              showZipChecker: true,
            },
            {
              type: "cta",
              heading: "Within Our Service Area?",
              subheading: "Schedule your first pickup today. Free delivery on orders over $25.",
              buttonText: "Schedule a Pickup",
              buttonLink: "/order",
            },
          ],
        },
        {
          title: "Contact Us",
          slug: "contact",
          seoTitle: `Contact Us — ${biz}`,
          seoDescription: `Get in touch with ${biz}. Call, email, or send us a message. We're here to help.`,
          sortOrder: 8,
          blocks: [
            {
              type: "hero",
              heading: "Contact Us",
              subheading: "Have a question? We're here to help.",
              ctaText: "",
              ctaLink: "",
              showGradient: false,
              backgroundImage: "https://images.unsplash.com/photo-1556740758-90de374c12ad?w=1600&q=80",
            },
            {
              type: "contact",
              heading: "Get in Touch",
              subheading: "Reach out by phone, email, or the form below.",
              showPhone: true,
              showEmail: true,
              showForm: true,
            },
            {
              type: "text",
              heading: "Hours & Location",
              body: `${data.address}, ${data.city}, ${data.state.toUpperCase()} ${data.zip}\n\nMonday - Friday: 7:00 AM - 9:00 PM\nSaturday: 8:00 AM - 8:00 PM\nSunday: 8:00 AM - 6:00 PM\n\nPickup & delivery available during all operating hours.`,
            },
          ],
        },
      ];

      for (const pageData of defaultPages) {
        await tx.page.create({
          data: {
            tenantId: tenant.id,
            title: pageData.title,
            slug: pageData.slug,
            seoTitle: pageData.seoTitle,
            seoDescription: pageData.seoDescription,
            isPublished: true,
            sortOrder: pageData.sortOrder,
            blocks: pageData.blocks,
          },
        });
      }

      return tenant;
    });

    return { success: true, tenantSlug: result.slug };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}
