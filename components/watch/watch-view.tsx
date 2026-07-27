"use client";

import { VideoPlayer } from "./video-player";
import { EpisodeBar } from "./episode-bar";
import { CommentsSection } from "./comments-section";
import { SeriesSidebar } from "./series-sidebar";
import type { AnimeDetail } from "@/lib/anilist";

export function WatchView({
  detail,
  animeId,
  currentEp,
}: {
  detail: AnimeDetail;
  animeId: number;
  currentEp: number;
}) {
  const recs = detail.recommendations.nodes
    .map((n) => n.mediaRecommendation)
    .filter((m): m is NonNullable<typeof m> => !!m);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <VideoPlayer src={null} poster={detail.bannerImage ?? detail.coverImage.large} />

        <div className="mt-4">
          <EpisodeBar
            animeId={animeId}
            totalEpisodes={detail.episodes ?? 1}
            currentEp={currentEp}
          />
        </div>

        <CommentsSection animeId={animeId} />
      </div>

      <div>
        <SeriesSidebar relations={detail.relations.edges} recommendations={recs} />
      </div>
    </div>
  );
}
