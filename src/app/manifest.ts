import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Laundry Shuttle",
    short_name: "Laundry Shuttle",
    description: "Professional laundry pickup & delivery platform",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0D1B2A",
    orientation: "portrait-primary",
    categories: ["business", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
