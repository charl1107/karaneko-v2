import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";
import type { NextConfig } from "next";

if (process.env.NODE_ENV === "development" && process.env.CLOUDFLARE_DEV_PLATFORM === "1") {
  void setupDevPlatform();
}

const nextConfig: NextConfig = {
  // Required for Cloudflare Pages/Workers deployment
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "*.ytimg.com" },
    ],
    unoptimized: true, // Required for Cloudflare Pages (no image optimization server)
  },
  // Disable x-powered-by header
  poweredByHeader: false,
};

export default nextConfig;
