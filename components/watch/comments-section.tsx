"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Tab = "episode" | "anime";

// Isolated TAC embed — remounts via `key` when episode or tab changes
function TACEmbed({
  malId,
  anilistId,
  episodeChapterNumber,
}: {
  malId:                number | null;
  anilistId:            number;
  episodeChapterNumber: string;
}) {
  useEffect(() => {
    const container = document.getElementById("anime-community-comment-section");
    if (!container) return;

    try {
      (window as unknown as Record<string, unknown>).theAnimeCommunityConfig = {
        ...(malId != null ? { MAL_ID: String(malId) } : {}),
        AniList_ID:            String(anilistId),
        episodeChapterNumber,
        mediaType:             "anime",
      };

      const script    = document.createElement("script");
      script.src      = "https://theanimecommunity.com/embed.js";
      script.id       = "anime-community-script";
      script.defer    = true;

      container.appendChild(script);
    } catch (e) {
      console.log(e);
    }

    return () => {
      const s = document.getElementById("anime-community-script");
      if (s) s.remove();
      delete (window as unknown as Record<string, unknown>).theAnimeCommunityConfig;
    };
  }, []); // one-shot per mount — key handles re-init

  return <div id="anime-community-comment-section" />;
}

// ─── CommentsSection ──────────────────────────────────────────────────────────

interface CommentsSectionProps {
  animeId: number;
  malId:   number | null;
  episode: number;
}

export function CommentsSection({ animeId, malId, episode }: CommentsSectionProps) {
  const [tab, setTab] = useState<Tab>("episode");

  // "0" → TAC general/series discussion when on Anime tab
  const epKey = tab === "episode" ? String(episode) : "0";

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#111]">

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-1 rounded-lg bg-white/[0.05] p-0.5">
          <button
            onClick={() => setTab("episode")}
            className={cn(
              "rounded-md px-3 py-1 text-[12px] font-semibold transition-colors",
              tab === "episode"
                ? "bg-primary text-black shadow"
                : "text-white/50 hover:text-white",
            )}
          >
            Episode {episode}
          </button>
          <button
            onClick={() => setTab("anime")}
            className={cn(
              "rounded-md px-3 py-1 text-[12px] font-semibold transition-colors",
              tab === "anime"
                ? "bg-primary text-black shadow"
                : "text-white/50 hover:text-white",
            )}
          >
            Anime
          </button>
        </div>
      </div>

      {/* ── Embed ────────────────────────────────────────────────────────── */}
      <div className="p-4">
        {/* key forces a full remount whenever episode or tab changes */}
        <TACEmbed
          key={`${animeId}-${epKey}`}
          malId={malId}
          anilistId={animeId}
          episodeChapterNumber={epKey}
        />
      </div>
    </div>
  );
}
