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

      // 5. Create default home page with blocks
      await tx.page.create({
        data: {
          tenantId: tenant.id,
          title: "Home",
          slug: "home",
          isPublished: true,
          sortOrder: 0,
          blocks: [
            {
              type: "hero",
              heading: `Welcome to ${data.businessName}`,
              subheading:
                "Professional laundry services picked up and delivered to your door.",
              ctaText: "Schedule Pickup",
              ctaLink: "/order",
              showGradient: true,
            },
            {
              type: "services",
              heading: "Our Services",
              showPrices: true,
            },
            {
              type: "features",
              heading: "Why Choose Us",
              features: [
                {
                  icon: "truck",
                  title: "Free Pickup & Delivery",
                  description:
                    "We come to you. Schedule a pickup and we handle the rest.",
                },
                {
                  icon: "clock",
                  title: "Fast Turnaround",
                  description:
                    "Get your clothes back fresh and clean within 24 hours.",
                },
                {
                  icon: "sparkles",
                  title: "Professional Care",
                  description:
                    "Expert cleaning for all fabric types and garments.",
                },
              ],
            },
            {
              type: "cta",
              heading: "Ready to simplify your laundry?",
              subheading:
                "Join hundreds of happy customers who never worry about laundry again.",
              buttonText: "Get Started",
              buttonLink: "/order",
            },
          ],
        },
      });

      return tenant;
    });

    return { success: true, tenantSlug: result.slug };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}
