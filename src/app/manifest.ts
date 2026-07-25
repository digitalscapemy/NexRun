import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NexRun — Run Event Management",
    short_name: "NexRun",
    description: "Malaysia's premier run event management platform. Discover, register, and manage running events.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#f97316",
    orientation: "portrait-primary",
    categories: ["sports", "lifestyle", "events"],
    icons: [
      {
        src: "/icons/nexrun-pwa-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/nexrun-pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/nexrun-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [],
    shortcuts: [
      {
        name: "Discover Events",
        short_name: "Events",
        description: "Browse upcoming running events",
        url: "/events",
        icons: [{ src: "/icons/nexrun-pwa-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "My Registrations",
        short_name: "Registrations",
        description: "View your race registrations",
        url: "/dashboard/registrations",
        icons: [{ src: "/icons/nexrun-pwa-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
