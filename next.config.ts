import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // In dev, skip Next's on-the-fly optimizer — AniList's CDN already serves
    // sized/cached covers, and optimizing 150+ remote images per page is the
    // single biggest dev slowdown. Production keeps full optimization.
    unoptimized: process.env.NODE_ENV !== "production",
    minimumCacheTTL: 86400,
    formats: ["image/webp"],
    // Episode thumbnails come from Miruro/AniPahe CDNs that can change — allow
    // all HTTPS sources so thumbnails always load regardless of origin.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
