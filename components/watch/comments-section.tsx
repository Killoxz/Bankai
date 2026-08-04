"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Tab = "episode" | "anime";

export function CommentsSection({
  animeId,
  malId,
  episode,
}: {
  animeId: number;
  malId:   number | null;
  episode: number;
}) {
  const [tab, setTab]    = useState<Tab>("episode");
  const scriptLoaded     = useRef(false);

  // "0" = series-level Anime tab; episode number = Episode tab
  const epKey = tab === "episode" ? String(episode) : "0";

  // ── Step 1: inject the TAC script once on mount (React pattern from docs) ──
  useEffect(() => {
    try {
      (window as unknown as Record<string, unknown>).theAnimeCommunityConfig = {
        ...(malId != null ? { MAL_ID: String(malId) } : {}),
        AniList_ID:            String(animeId),
        episodeChapterNumber:  epKey,
        mediaType:             "anime",
      };

      const script   = document.createElement("script");
      script.src     = "https://theanimecommunity.com/embed.js";
      script.id      = "anime-community-script";
      script.defer   = true;

      document.getElementById("anime-community-comment-section")?.appendChild(script);
      scriptLoaded.current = true;
    } catch (e) {
      console.log(e);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 2: when episode or tab changes, update config and ask TAC to reload ─
  // The div stays in the DOM — no flash, no disappearing comments.
  useEffect(() => {
    if (!scriptLoaded.current) return;

    (window as unknown as Record<string, unknown>).theAnimeCommunityConfig = {
      ...(malId != null ? { MAL_ID: String(malId) } : {}),
      AniList_ID:            String(animeId),
      episodeChapterNumber:  epKey,
      mediaType:             "anime",
    };

    const tac = (window as unknown as { theAnimeCommunity?: { reload?: () => void } })
      .theAnimeCommunity;
    tac?.reload?.();
  }, [epKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-xl border border-border bg-card">

      {/* ── Episode / Anime tab switcher ──────────────────────────────────── */}
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

      {/* ── Single persistent div — never unmounts, no flash ─────────────── */}
      <div id="anime-community-comment-section" />
    </div>
  );
}
