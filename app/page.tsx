import { getProvider } from "@/services/providers";
import { MockProvider } from "@/services/providers/mock";
import type { HomeSections } from "@/services/providers/types";
import { PageContainer } from "@/components/layout/page-container";
import { HomeLayout } from "@/features/home/home-layout";

// Cache the rendered homepage for an hour (ISR) — repeat visits are instant.
export const revalidate = 3600;


const PER_PAGE = 14;

async function loadSections(): Promise<HomeSections> {
  const p = getProvider();
  // Prefer the batched single-request path (AniList) to avoid rate limits.
  if (p.getHomeSections) return p.getHomeSections(PER_PAGE);
  const q = { perPage: PER_PAGE } as const;
  const [trending, popular, topRated, recentlyUpdated, upcoming, movies, tv] =
    await Promise.all([
      p.getTrending(q),
      p.getPopular(q),
      p.getTopRated(q),
      p.getRecentlyUpdated(q),
      p.getUpcoming(q),
      p.search({ format: "MOVIE", sort: "POPULARITY_DESC", ...q }),
      p.search({ format: "TV", sort: "SCORE_DESC", ...q }),
    ]);
  return {
    trending: trending.items,
    popular: popular.items,
    topRated: topRated.items,
    recentlyUpdated: recentlyUpdated.items,
    upcoming: upcoming.items,
    movies: movies.items,
    tv: tv.items,
  };
}

// Server component: fetch all rows, stream to the client. Never hard-crash —
// if the live provider is down/rate-limited, fall back to bundled demo data.
export default async function HomePage() {
  let sections: HomeSections;
  let genres: string[];
  try {
    [sections, genres] = await Promise.all([loadSections(), getProvider().getGenres()]);
  } catch {
    const mock = new MockProvider();
    sections = await mock.getHomeSections!(PER_PAGE);
    genres = await mock.getGenres();
  }
  const { trending, popular, topRated, recentlyUpdated, upcoming, movies, tv } = sections;

  return (
    <PageContainer>
      <HomeLayout sections={sections} genres={genres} />
    </PageContainer>
  );
}
