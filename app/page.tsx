import { getHomeData, type AnimeMedia } from "@/lib/anilist";
import { Navbar } from "@/components/layout/navbar";
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
  } catch {
    /* AniList unreachable — the empty state below renders instead */
  }

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <HeroCarousel items={heroItems} />

      <div className="relative z-10 -mt-4 space-y-10 px-6 pb-16 sm:px-10">
        {trending.length === 0 ? (
          <p className="py-16 text-center text-sm text-white/40">
            Couldn&apos;t load anime right now — refresh to try again.
          </p>
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
