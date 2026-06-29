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
    // Remote anime art comes from AniList/Jikan/TMDB CDNs. Add hosts as needed.
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "img.anili.st" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "media.kitsu.io" },
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "artworks.thetvdb.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
