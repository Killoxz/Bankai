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
    // Every next/image usage in this app renders AniList-sourced media (covers,
    // banners, character/staff art) — scoped to their CDN, not a wildcard.
    // User-uploaded avatars/banners (Vercel Blob) render via plain <img>
    // instead, since that's arbitrary-host user content, not something to
    // route through Next's remote-image allowlist.
    remotePatterns: [{ protocol: "https", hostname: "**.anilist.co" }],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
