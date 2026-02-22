interface LocalBusinessJsonLdProps {
  businessName: string;
  slug: string;
  customDomain?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  } | null;
  geo?: {
    lat: number;
    lng: number;
  } | null;
  operatingHours?: Record<string, { open: string; close: string }> | null;
  logoUrl?: string | null;
}

export function LocalBusinessJsonLd({
  businessName,
  slug,
  customDomain,
  phone,
  email,
  address,
  geo,
  operatingHours,
  logoUrl,
}: LocalBusinessJsonLdProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://laundryshuttle.com";
  const url = customDomain
    ? `https://${customDomain}`
    : `${baseUrl.replace("://", `://${slug}.`)}`;

  const dayMap: Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  };

  const openingHours = operatingHours
    ? Object.entries(operatingHours).map(([day, hours]) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: dayMap[day] || day,
        opens: hours.open,
        closes: hours.close,
      }))
    : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LaundryOrDryCleaning",
    name: businessName,
    url,
    ...(phone && { telephone: phone }),
    ...(email && { email }),
    ...(logoUrl && { logo: logoUrl }),
    ...(address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: address.street,
        addressLocality: address.city,
        addressRegion: address.state,
        postalCode: address.zip,
        addressCountry: "US",
      },
    }),
    ...(geo && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: geo.lat,
        longitude: geo.lng,
      },
    }),
    ...(openingHours && { openingHoursSpecification: openingHours }),
    priceRange: "$$",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Laundry Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Wash & Fold",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Pickup & Delivery",
          },
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
