"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Tab = "episode" | "anime";

// ─── TAC comment block ────────────────────────────────────────────────────────
// Exactly the React pattern TAC documented.
// Remounted via `key` whenever episode or tab changes so useEffect re-fires.

function TACComments({
  malId,
  anilistId,
  episodeChapterNumber,
}: {
  malId:                number | null;
  anilistId:            number;
  episodeChapterNumber: string;
}) {
  useEffect(() => {
    try {
      (window as unknown as Record<string, unknown>).theAnimeCommunityConfig = {
        ...(malId != null ? { MAL_ID: String(malId) } : {}),
        AniList_ID:            String(anilistId),
        episodeChapterNumber,
        mediaType:             "anime",
      };

      const script    = document.createElement("script");
      script.src      = `https://theanimecommunity.com/embed.js`;
      script.id       = "anime-community-script";
      script.defer    = true;

      document.getElementById("anime-community-comment-section")?.appendChild(script);
    } catch (e) {
      console.log(e);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div id={"anime-community-comment-section"}></div>;
}

// ─── CommentsSection ──────────────────────────────────────────────────────────

export function CommentsSection({
  animeId,
  malId,
  episode,
}: {
  animeId: number;
  malId:   number | null;
  episode: number;
}) {
  const [tab, setTab] = useState<Tab>("episode");

  // "0" = series-level Anime tab; episode number = Episode tab
  const epKey = tab === "episode" ? String(episode) : "0";

  return (
    <div className="rounded-xl border border-border bg-card">

      {/* ── Episode / Anime tab switcher ─────────────────────────────────── */}
      <div className="flex items-center border-b border-border px-4 py-3">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
          <button
            onClick={() => setTab("episode")}
            className={cn(
              "rounded-md px-3 py-1 text-[12px] font-semibold transition-colors",
              tab === "episode"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Episode {episode}
          </button>
          <button
            onClick={() => setTab("anime")}
            className={cn(
              "rounded-md px-3 py-1 text-[12px] font-semibold transition-colors",
              tab === "anime"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Anime
          </button>
        </div>
      </div>

      {/* ── TAC embed — key remounts the component on every tab/episode change */}
      <TACComments
        key={`${animeId}-${epKey}`}
        malId={malId}
        anilistId={animeId}
        episodeChapterNumber={epKey}
      />
    </div>
  );
}
