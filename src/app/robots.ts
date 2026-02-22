import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://laundryshuttle.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/manager/",
          "/attendant/",
          "/driver/",
          "/customer/",
          "/pos/",
          "/admin/",
          "/settings/",
          "/login",
          "/register",
          "/forgot-password",
          "/onboarding",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
