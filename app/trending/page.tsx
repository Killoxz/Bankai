import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { BrowseView } from "@/components/browse/browse-view";
import { getTagCollection, type AnimeMedia, type BrowseFilters } from "@/lib/anilist";

export const metadata: Metadata = {
  title: "Trending Anime • Bankai",
  description: "Discover the most popular and trending anime right now.",
};

export const revalidate = 1800;

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; status?: string; genre?: string; tag?: string; year?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const availableTags = await getTagCollection().catch(() => []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-6 pb-16 pt-6 sm:px-10 md:pt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Trending Now</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-white/50">
            The most-watched anime this season, updated every 30 minutes.
          </p>
        </div>
        <BrowseView
          initial={{
            sort: "TRENDING_DESC" as BrowseFilters["sort"],
            format: (sp.format as AnimeMedia["format"]) || undefined,
            status: (sp.status as AnimeMedia["status"]) || undefined,
            genre: sp.genre ? sp.genre.split(",") : undefined,
            tag: sp.tag ? sp.tag.split(",") : undefined,
            year: sp.year ? Number(sp.year) : undefined,
            search: sp.q || undefined,
          }}
          basePath="/trending"
          availableTags={availableTags}
        />
      </div>
      <Footer />
    </div>
  );
}
