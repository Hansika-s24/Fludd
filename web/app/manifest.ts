import type { MetadataRoute } from "next";

/** Home Screen app: name, colours and the logo icons (iOS reads app/apple-icon.png). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fludd",
    short_name: "Fludd",
    description: "A flood report card for any address: a grade, where the water goes hour by hour, and when to move your car.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfaf6",
    theme_color: "#23467f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
