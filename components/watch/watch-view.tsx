"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { DownPlayer } from "./down-player";
import { CommentsSection } from "./comments-section";
import { SeriesSidebar } from "./series-sidebar";
import { EpisodeList } from "./episode-list";
import type { AnimeDetail } from "@/lib/anilist";

interface WatchViewProps {
  detail: AnimeDetail;
  animeId: number;
  initialEpisode?: number;
}

export function WatchView({ detail, animeId, initialEpisode = 1 }: WatchViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [episode, setEpisode] = useState(initialEpisode);

  const recs = detail.recommendations.nodes
    .map((n) => n.mediaRecommendation)
    .filter((m): m is NonNullable<typeof m> => !!m);

  function handleSelectEpisode(ep: number) {
    setEpisode(ep);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("ep", String(ep));
    router.replace(`/watch/${animeId}?${sp.toString()}`, { scroll: false });
  }

  const totalEpisodes = detail.episodes ?? 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <motion.div
        className="min-w-0"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <DownPlayer
          poster={detail.bannerImage ?? detail.coverImage.large}
          animeId={animeId}
          episode={episode}
        />

        {/* Episode list below player */}
        {totalEpisodes > 1 && (
          <div className="mt-4">
            <EpisodeList
              totalEpisodes={totalEpisodes}
              currentEpisode={episode}
              onSelectEpisode={handleSelectEpisode}
            />
          </div>
        )}

        <CommentsSection animeId={animeId} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <SeriesSidebar relations={detail.relations.edges} recommendations={recs} />
      </motion.div>
    </div>
  );
}
