"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Tab = "episode" | "anime";

// Reads Bankai's current --primary CSS variable so TAC matches the active theme
function getPrimaryColor(): string {
  if (typeof window === "undefined") return "hsl(37,91%,55%)";
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim();
  return val ? `hsl(${val})` : "hsl(37,91%,55%)";
}

function buildConfig(
  malId:                number | null,
  anilistId:            number,
  episodeChapterNumber: string,
) {
  const primary = getPrimaryColor();
  return {
    ...(malId != null ? { MAL_ID: String(malId) } : {}),
    AniList_ID:            String(anilistId),
    episodeChapterNumber,
    mediaType:             "anime",
    removeBorder:          "true",
    removePadding:         "true",
    colorScheme: {
      primaryColor:       primary,
      backgroundColor:    "#111111",
      dropDownTextColor:  "rgba(255,255,255,0.75)",
      strongTextColor:    "#ffffff",
      primaryTextColor:   "rgba(255,255,255,0.85)",
      secondaryTextColor: "rgba(255,255,255,0.4)",
      iconColor:          "rgba(255,255,255,0.5)",
      accentColor:        primary,
    },
  };
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
  const [tab, setTab]  = useState<Tab>("episode");
  const scriptLoaded   = useRef(false);

  // "0" is used as the series-level (Anime tab) discussion thread
  const epKey = tab === "episode" ? String(episode) : "0";

  // ── Mount: inject config + embed script once ─────────────────────────────
  useEffect(() => {
    const container = document.getElementById("anime-community-comment-section");
    if (!container) return;

    (window as unknown as Record<string, unknown>).theAnimeCommunityConfig =
      buildConfig(malId, animeId, epKey);

    const script = document.createElement("script");
    script.src   = "https://theanimecommunity.com/embed.js";
    script.id    = "anime-community-script";
    script.defer = true;
    container.appendChild(script);

    scriptLoaded.current = true;

    return () => {
      document.getElementById("anime-community-script")?.remove();
      delete (window as unknown as Record<string, unknown>).theAnimeCommunityConfig;
      scriptLoaded.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Episode / tab change: update config then call the reload API ─────────
  useEffect(() => {
    // Always refresh config so it's current when the script eventually loads
    (window as unknown as Record<string, unknown>).theAnimeCommunityConfig =
      buildConfig(malId, animeId, epKey);

    // If the embed is already running, tell it to reload with the new config
    const tac = (
      window as unknown as { theAnimeCommunity?: { reload?: () => void } }
    ).theAnimeCommunity;
    tac?.reload?.();
  }, [epKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timestamp clicks → seek the video player ─────────────────────────────
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (
        event.data?.type === "TAC-TIMESTAMP-CLICK" &&
        typeof event.data.time === "number"
      ) {
        // Dispatch a custom event so the player can listen and seek
        window.dispatchEvent(
          new CustomEvent("tac-seek", { detail: { time: event.data.time } }),
        );
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#111]">

      {/* ── Episode / Anime tab switcher ─────────────────────────────────── */}
      <div className="flex items-center border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-1 rounded-lg bg-white/[0.05] p-0.5">
          <button
            onClick={() => setTab("episode")}
            className={cn(
              "rounded-md px-3 py-1 text-[12px] font-semibold transition-colors",
              tab === "episode"
                ? "bg-primary text-primary-foreground shadow"
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
                ? "bg-primary text-primary-foreground shadow"
                : "text-white/50 hover:text-white",
            )}
          >
            Anime
          </button>
        </div>
      </div>

      {/* ── TAC embed container ──────────────────────────────────────────── */}
      <div id="anime-community-comment-section" />
    </div>
  );
}
