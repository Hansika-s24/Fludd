import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The reports route reads the gold files (model depth at the photo) on the server; ship them with it on Vercel.
  outputFileTracingIncludes: {
    "/api/reports": ["./public/data/**/*"],
    "/api/health": ["./public/data/manifest.json", "./public/data/toy/manifest.json"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
