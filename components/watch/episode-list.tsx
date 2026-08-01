"use client";

import { useState, useEffect, useRef } from "react";
import { Search, List, Grid2X2, ChevronDown, Subtitles } from "lucide-react";
import type { ProviderEpisode } from "./episode-utils";

interface EpisodeListProps {
  totalEpisodes: number;
  currentEpisode: number;
  onSelectEpisode: (ep: number) => void;
  episodeData: ProviderEpisode[];
  hasSub: boolean;
  hasDub: boolean;
  currentAudio: "sub" | "dub";
}

const BATCH = 50;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatAirDate(d: string | null | undefined): string | null {
  if (!d) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d));
  } catch {
    return null;
  }
}

export function EpisodeList({
  totalEpisodes,
  currentEpisode,
  onSelectEpisode,
  episodeData,
  hasSub,
  hasDub,
}: EpisodeListProps) {
  const [search, setSearch]         = useState("");
  const [batchStart, setBatchStart] = useState(1);
  const [batchOpen, setBatchOpen]   = useState(false);
  const [viewMode, setViewMode]     = useState<"list" | "grid">("list");
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const batchEnd    = Math.min(batchStart + BATCH - 1, totalEpisodes);
  const totalBatches = Math.ceil(totalEpisodes / BATCH);

  // Sync batch to current episode
  useEffect(() => {
    const correctStart = (Math.ceil(currentEpisode / BATCH) - 1) * BATCH + 1;
    setBatchStart(Math.max(1, correctStart));
  }, [currentEpisode]);

  // Scroll active episode into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [batchStart, currentEpisode]);

  if (totalEpisodes <= 1) return null;

  // Build episode number list for this batch
  const batchNums = Array.from(
    { length: batchEnd - batchStart + 1 },
    (_, i) => batchStart + i
  );

  // Map episode number → metadata
  const metaByNum = new Map<number, ProviderEpisode>(
    episodeData.map((ep) => [ep.number, ep])
  );

  // Filter by search (number or title match)
  const filtered = batchNums.filter((n) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    if (String(n).includes(q)) return true;
    const meta = metaByNum.get(n);
    if (meta?.title?.toLowerCase().includes(q)) return true;
    return false;
  });

  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-[#111]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
        {/* Batch range picker */}
        <div className="relative">
          <button
            onClick={() => setBatchOpen((o) => !o)}
            className="flex items-center gap-1 rounded-md bg-white/6 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
          >
            {batchStart}–{batchEnd}
            <ChevronDown className="size-3 text-white/40" />
          </button>

          {batchOpen && (
            <div className="absolute left-0 top-9 z-30 max-h-40 w-28 overflow-y-auto rounded-lg border border-white/10 bg-[#1c1c1c] py-1 shadow-2xl">
              {Array.from({ length: totalBatches }, (_, i) => {
                const s = i * BATCH + 1;
                const e = Math.min(s + BATCH - 1, totalEpisodes);
                const isActive = s === batchStart;
                return (
                  <button
                    key={s}
                    onClick={() => { setBatchStart(s); setBatchOpen(false); setSearch(""); }}
                    className={[
                      "block w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/6",
                      isActive ? "text-primary" : "text-white/70",
                    ].join(" ")}
                  >
                    {s}–{e}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search episodes…"
            className="w-full rounded-md border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-xs text-white outline-none placeholder:text-white/25 focus:border-white/25"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode("list")}
            className={[
              "rounded p-1.5 transition-colors",
              viewMode === "list" ? "text-white" : "text-white/30 hover:text-white/60",
            ].join(" ")}
          >
            <List className="size-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={[
              "rounded p-1.5 transition-colors",
              viewMode === "grid" ? "text-white" : "text-white/30 hover:text-white/60",
            ].join(" ")}
          >
            <Grid2X2 className="size-4" />
          </button>
        </div>
      </div>

      {/* ── List view ──────────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="max-h-[560px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-white/30">No episodes match.</p>
          ) : (
            filtered.map((n) => {
              const meta    = metaByNum.get(n);
              const isActive = n === currentEpisode;
              const thumb   = meta?.thumbnail ?? meta?.image ?? null;
              const title   = meta?.title && meta.title !== `Episode ${n}` ? meta.title : null;
              const airDate = formatAirDate(meta?.airDate);

              return (
                <button
                  key={n}
                  ref={isActive ? (el) => { (activeRef as React.MutableRefObject<HTMLButtonElement | null>).current = el; } : undefined}
                  onClick={() => { onSelectEpisode(n); setSearch(""); }}
                  className={[
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                    isActive
                      ? "bg-primary/20"
                      : "hover:bg-white/5",
                  ].join(" ")}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-white/5">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <span className="text-[10px] font-bold text-white/20">EP {pad2(n)}</span>
                      </div>
                    )}
                    {/* EP badge */}
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white/90">
                      EP {pad2(n)}
                    </span>
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute right-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-black">
                        NOW
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className={[
                      "line-clamp-1 text-sm font-semibold leading-tight",
                      isActive ? "text-primary" : "text-white",
                    ].join(" ")}>
                      {title ?? `Episode ${n}`}
                    </p>

                    {/* Badges + date */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {hasSub && (
                        <span className="flex items-center gap-0.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">
                          <Subtitles className="size-2.5" />
                          CC
                        </span>
                      )}
                      {hasDub && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">
                          DUB
                        </span>
                      )}
                      {airDate && (
                        <span className="text-[11px] text-white/35">{airDate}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ── Grid view ──────────────────────────────────────────────────────── */}
      {viewMode === "grid" && (
        <div className="max-h-[560px] overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-white/30">No episodes match.</p>
          ) : (
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
              {filtered.map((n) => {
                const isActive = n === currentEpisode;
                return (
                  <button
                    key={n}
                    ref={isActive ? (el) => { (activeRef as React.MutableRefObject<HTMLButtonElement | null>).current = el; } : undefined}
                    onClick={() => { onSelectEpisode(n); setSearch(""); }}
                    className={[
                      "rounded-lg py-2.5 text-sm font-bold transition-colors",
                      isActive
                        ? "bg-primary text-black shadow-lg shadow-primary/30"
                        : "bg-white/8 text-white/65 hover:bg-white/14 hover:text-white",
                    ].join(" ")}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
