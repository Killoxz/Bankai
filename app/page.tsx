import Link from "next/link";
import { getHomeData, type AnimeMedia } from "@/lib/anilist";
import { Footer } from "@/components/layout/footer";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { AnimeRow } from "@/components/home/anime-row";
import { HomeRows } from "@/components/home/home-rows";

export const revalidate = 3600;

export default async function HomePage() {
  let heroItems: AnimeMedia[] = [];
  let trending: AnimeMedia[]  = [];
  let topRated: AnimeMedia[]  = [];
  let newSeason: AnimeMedia[] = [];

  try {
    ({ heroItems, trending, topRated, newSeason } = await getHomeData());
  } catch (err) {
    console.error("[HomePage] AniList fetch failed:", err);
  }

  return (
    <div className="min-h-screen bg-background">
      <HeroCarousel items={heroItems} />

      <div className="relative z-10 -mt-4 space-y-10 px-6 pb-16 sm:px-10">
        {trending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <p className="text-2xl font-semibold text-foreground">Service Temporarily Unavailable</p>
            <p className="text-sm text-muted-foreground max-w-sm text-center">
              The anime data provider is experiencing issues. Please check back shortly.
            </p>
            <Link
              href="/"
              className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Try Again
            </Link>
          </div>
        ) : (
          <>
            <AnimeRow title="Trending Now" items={trending} />
            <HomeRows newSeason={newSeason} topRated={topRated} />
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
