import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { BrowseView } from "@/components/browse/browse-view";
import { getTagCollection, type AnimeMedia, type BrowseFilters } from "@/lib/anilist";

export const metadata: Metadata = { title: "Browse • Bankai" };

const TITLES: Record<string, string> = {
  MOVIE: "Movies",
  RELEASING: "New Season",
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; status?: string; genre?: string; tag?: string; year?: string; sort?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const filters: BrowseFilters = {
    format: (sp.format as AnimeMedia["format"]) || undefined,
    status: (sp.status as AnimeMedia["status"]) || undefined,
    genre: sp.genre ? sp.genre.split(",") : undefined,
    tag: sp.tag ? sp.tag.split(",") : undefined,
    year: sp.year ? Number(sp.year) : undefined,
    sort: (sp.sort as BrowseFilters["sort"]) || undefined,
    search: sp.q || undefined,
  };

  const heading = TITLES[sp.format ?? ""] || TITLES[sp.status ?? ""] || (sp.q ? `Results for "${sp.q}"` : "Browse");
  const availableTags = await getTagCollection().catch(() => []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-6 pb-16 pt-6 sm:px-10 md:pt-20">
        <h1 className="mb-6 text-2xl font-bold text-white sm:text-3xl">{heading}</h1>
        <BrowseView initial={filters} availableTags={availableTags} />
      </div>
      <Footer />
    </div>
  );
}
