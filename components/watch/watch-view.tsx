import { MyLibrary } from "./my-library";
import { StreamingLinks } from "./streaming-links";
import { CommentsSection } from "./comments-section";
import { SeriesSidebar } from "./series-sidebar";
import type { AnimeDetail } from "@/lib/anilist";

export function WatchView({ detail, animeId }: { detail: AnimeDetail; animeId: number }) {
  const recs = detail.recommendations.nodes
    .map((n) => n.mediaRecommendation)
    .filter((m): m is NonNullable<typeof m> => !!m);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <MyLibrary animeId={animeId} poster={detail.bannerImage ?? detail.coverImage.large} />
        <StreamingLinks links={detail.externalLinks} />
        <CommentsSection animeId={animeId} />
      </div>

      <div>
        <SeriesSidebar relations={detail.relations.edges} recommendations={recs} />
      </div>
    </div>
  );
}
