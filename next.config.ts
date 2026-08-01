import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // On Render (and any read-only-filesystem host) Next.js cannot write to
  // /app/.next/cache at runtime. Two mitigations:
  //
  // 1. images.unoptimized — AniList's CDN already serves WebP at appropriate
  //    sizes, so we don't need Next's image optimizer.  This stops the
  //    unhandledRejection spam from mkdir('/app/.next/cache/images').
  //
  // 2. cacheHandler — redirect the ISR / fetch data cache to /tmp so
  //    prerender-cache writes don't hit the read-only filesystem.
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**.anilist.co" }],
  },

  ...(isProd && {
    cacheHandler: require.resolve("./cache-handler.cjs"),
    cacheMaxMemorySize: 0,
  }),

  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
