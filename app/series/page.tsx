import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BrowseView } from "@/components/browse/browse-view";
import type { AnimeMedia, BrowseFilters } from "@/lib/anilist";

export const metadata: Metadata = { title: "Series — Bankai" };

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; status?: string; genre?: string; sort?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const filters: BrowseFilters = {
    format: (sp.format as AnimeMedia["format"]) || "TV",
    status: (sp.status as AnimeMedia["status"]) || undefined,
    genre: sp.genre || undefined,
    sort: (sp.sort as BrowseFilters["sort"]) || undefined,
    search: sp.q || undefined,
  };

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <div className="mx-auto max-w-[1600px] px-6 pb-16 pt-24 sm:px-10">
        <h1 className="mb-6 text-2xl font-bold text-white sm:text-3xl">
          {sp.q ? `Results for "${sp.q}"` : "Series"}
        </h1>
        <BrowseView initial={filters} basePath="/series" />
      </div>
      <Footer />
    </div>
  );
}
