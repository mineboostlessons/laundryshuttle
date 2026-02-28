import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { getCurrentTenant, getFullTenantInfo } from "@/lib/tenant";
import type { PageBlock } from "@/types/blocks";
import { BlockRenderer } from "@/components/blocks";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantFooter } from "@/components/tenant/tenant-footer";
import { LocalBusinessJsonLd } from "@/components/seo/json-ld";
import { MarketingLandingPage } from "@/components/marketing/landing-page";
import { formatCurrency } from "@/lib/utils";
import {
  Truck,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { HomepageAddressChecker } from "./components/homepage-address-checker";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getFullTenantInfo();
  if (!tenant) return {};

  const page = await prisma.page.findFirst({
    where: { tenantId: tenant.id, slug: "home", isPublished: true },
    select: { seoTitle: true, seoDescription: true },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://laundryshuttle.com";
  const tenantUrl = tenant.slug
    ? `${baseUrl.replace("://", `://${tenant.slug}.`)}`
    : baseUrl;

  const title =
    page?.seoTitle || tenant.seoDefaults?.metaTitleTemplate || tenant.businessName;
  const description =
    page?.seoDescription ||
    tenant.seoDefaults?.metaDescriptionTemplate ||
    `${tenant.businessName} — Professional laundry pickup & delivery services`;

  const ogImage = tenant.seoDefaults?.ogImageUrl || undefined;

  return {
    title,
    description,
    alternates: {
      canonical: tenantUrl,
    },
    openGraph: {
      title,
      description,
      url: tenantUrl,
      siteName: tenant.businessName,
      type: "website",
      locale: "en_US",
      ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

export default async function TenantHomePage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");
  const customDomain = headersList.get("x-custom-domain");

  // Platform context — render marketing landing page (but not for custom domains)
  if (!customDomain && (!tenantSlug || tenantSlug === "__platform__")) {
    return <MarketingLandingPage />;
  }

  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  // Fetch location info for JSON-LD structured data
  const location = await prisma.laundromat.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    select: {
      address: true,
      city: true,
      state: true,
      zip: true,
      lat: true,
      lng: true,
      phone: true,
      operatingHours: true,
    },
  });

  const fullTenant = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      phone: true,
      email: true,
      customDomain: true,
      themeConfig: true,
    },
  });

  const themeConfig = fullTenant?.themeConfig as Record<string, string> | null;

  const page = await prisma.page.findFirst({
    where: { tenantId: tenant.id, slug: "home", isPublished: true },
    select: { blocks: true },
  });

  const blocks = (page?.blocks as PageBlock[] | null) ?? [];

  // If tenant has page-builder blocks, render those
  if (blocks.length > 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <LocalBusinessJsonLd
          businessName={tenant.businessName}
          slug={tenant.slug}
          customDomain={fullTenant?.customDomain}
          phone={fullTenant?.phone}
          email={fullTenant?.email}
          address={
            location
              ? { street: location.address, city: location.city, state: location.state, zip: location.zip }
              : null
          }
          geo={location ? { lat: location.lat, lng: location.lng } : null}
          operatingHours={location?.operatingHours as Record<string, { open: string; close: string }> | null}
          logoUrl={themeConfig?.logoUrl}
        />
        <TenantHeader />
        <main id="main-content" className="flex-1">
          <BlockRenderer blocks={blocks} />
        </main>
        <TenantFooter />
      </div>
    );
  }

  // Otherwise, render a dynamic default homepage with live data
  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      pricingType: true,
      price: true,
    },
  });

  const pricingLabels: Record<string, string> = {
    per_pound: "/lb",
    per_bag: "/bag",
    per_item: "/item",
    flat_rate: "",
  };

  const categoryLabels: Record<string, string> = {
    wash_and_fold: "Wash & Fold",
    dry_cleaning: "Dry Cleaning",
    specialty: "Specialty",
  };

  return (
    <div className="flex min-h-screen flex-col">
      <LocalBusinessJsonLd
        businessName={tenant.businessName}
        slug={tenant.slug}
        customDomain={fullTenant?.customDomain}
        phone={fullTenant?.phone}
        email={fullTenant?.email}
        address={
          location
            ? { street: location.address, city: location.city, state: location.state, zip: location.zip }
            : null
        }
        geo={location ? { lat: location.lat, lng: location.lng } : null}
        operatingHours={location?.operatingHours as Record<string, { open: string; close: string }> | null}
        logoUrl={themeConfig?.logoUrl}
      />
      <TenantHeader />
      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <section
          className="relative overflow-hidden px-6 py-24 sm:py-32"
          style={{ background: "var(--hero-gradient)" }}
        >
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-heading text-4xl text-foreground sm:text-5xl lg:text-6xl">
              Professional Laundry,{" "}
              <span className="text-primary">Delivered</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              {tenant.businessName} offers convenient pickup and delivery
              laundry services. We handle the dirty work so you can enjoy your
              free time.
            </p>
            <div className="mt-10">
              <HomepageAddressChecker />
            </div>
            <div className="mt-4 flex items-center justify-center gap-4">
              <Link
                href="/order"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Schedule a Pickup
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link
                href="#services"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
              >
                View Services
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-b bg-card px-6 py-16" aria-labelledby="features-heading">
          <h2 id="features-heading" className="sr-only">Why Choose Us</h2>
          <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Truck,
                title: "Free Pickup & Delivery",
                desc: "We come to your door on your schedule.",
              },
              {
                icon: Clock,
                title: "24-Hour Turnaround",
                desc: "Get your clothes back fresh and fast.",
              },
              {
                icon: Sparkles,
                title: "Expert Care",
                desc: "Professional cleaning for all fabrics.",
              },
              {
                icon: ShieldCheck,
                title: "Satisfaction Guaranteed",
                desc: "Not happy? We'll re-clean for free.",
              },
            ].map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Services Section */}
        {services.length > 0 && (
          <section id="services" className="px-6 py-16 sm:py-20" aria-labelledby="services-heading">
            <div className="mx-auto max-w-5xl">
              <h2 id="services-heading" className="font-heading text-center text-3xl text-foreground">
                Our Services
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
                From everyday laundry to specialty items, we have you covered.
              </p>

              {/* Group by category */}
              {Object.entries(
                services.reduce(
                  (acc, s) => {
                    const cat = s.category;
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(s);
                    return acc;
                  },
                  {} as Record<string, typeof services>
                )
              ).map(([category, categoryServices]) => (
                <div key={category} className="mt-10">
                  <h3 className="text-lg font-semibold text-foreground">
                    {categoryLabels[category] ?? category}
                  </h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryServices.map((service) => (
                      <div
                        key={service.id}
                        className="rounded-lg border bg-card p-5 transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-foreground">
                            {service.name}
                          </h4>
                          <span className="whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
                            {formatCurrency(service.price)}
                            {pricingLabels[service.pricingType] ?? ""}
                          </span>
                        </div>
                        {service.description && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {service.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-10 text-center">
                <Link
                  href="/order"
                  className="inline-flex items-center gap-2 bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  style={{ borderRadius: "var(--button-radius)" }}
                >
                  Order Now
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="bg-primary px-6 py-16 text-center text-primary-foreground" aria-labelledby="cta-heading">
          <div className="mx-auto max-w-2xl">
            <h2 id="cta-heading" className="font-heading text-3xl">Ready to Get Started?</h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Schedule your first pickup in minutes. No commitments, no
              hassle.
            </p>
            <Link
              href="/order"
              className="mt-8 inline-flex items-center gap-2 bg-background px-6 py-3 text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
              style={{ borderRadius: "var(--button-radius)" }}
            >
              Schedule a Pickup
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <TenantFooter />
    </div>
  );
}
