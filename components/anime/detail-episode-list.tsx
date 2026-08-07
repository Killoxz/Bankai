"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search, LayoutList, LayoutGrid, Image as ImageIcon,
  ChevronDown, Play, Loader2,
} from "lucide-react";
import {
  parseProviders,
  mergedEpisodeList,
  type ProviderEpisode,
} from "@/components/watch/episode-utils";
import { useSettingsStore } from "@/store/settings-store";

const BATCH = 50;

function formatAirDate(d: string | null | undefined): string | null {
  if (!d) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short", day: "2-digit", year: "numeric",
    }).format(new Date(d));
  } catch { return null; }
}

export function DetailEpisodeList({ animeId }: { animeId: number }) {
  const [episodes, setEpisodes]     = useState<ProviderEpisode[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const defaultLayout   = useSettingsStore((s) => s.episodeLayout);
  const setStoredLayout = useSettingsStore((s) => s.setEpisodeLayout);

  const [search, setSearch]         = useState("");
  const [batchStart, setBatchStart] = useState(1);
  const [batchOpen, setBatchOpen]   = useState(false);
  const [viewMode, setViewMode]     = useState<"list" | "grid" | "image">(defaultLayout);

  function changeView(mode: "list" | "grid" | "image") {
    setViewMode(mode);
    setStoredLayout(mode);
  }

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/episodes/${animeId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((raw: Record<string, unknown>) => {
        const providers = parseProviders(raw);
        const sub = mergedEpisodeList(providers, "sub");
        const dub = mergedEpisodeList(providers, "dub");
        setEpisodes(sub.length >= dub.length ? sub : dub);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [animeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (error || episodes.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {error ? "Could not load episodes." : "No episodes available yet."}
      </p>
    );
  }

  const totalEpisodes = episodes[episodes.length - 1]?.number ?? episodes.length;
  const batchEnd      = Math.min(batchStart + BATCH - 1, totalEpisodes);
  const totalBatches  = Math.ceil(totalEpisodes / BATCH);

  const metaByNum = new Map<number, ProviderEpisode>(episodes.map((ep) => [ep.number, ep]));
  const batchNums = Array.from(
    { length: batchEnd - batchStart + 1 },
    (_, i) => batchStart + i,
  );

  const filtered = batchNums.filter((n) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    if (String(n).includes(q)) return true;
    return !!metaByNum.get(n)?.title?.toLowerCase().includes(q);
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {/* Batch picker */}
        <div className="relative">
          <button
            onClick={() => setBatchOpen((o) => !o)}
            className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            {batchStart}–{batchEnd}
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>
          {batchOpen && (
            <div className="absolute left-0 top-9 z-30 max-h-40 w-28 overflow-y-auto rounded-lg border border-border bg-popover py-1 shadow-2xl">
              {Array.from({ length: totalBatches }, (_, i) => {
                const s = i * BATCH + 1;
                const e = Math.min(s + BATCH - 1, totalEpisodes);
                return (
                  <button
                    key={s}
                    onClick={() => { setBatchStart(s); setBatchOpen(false); setSearch(""); }}
                    className={[
                      "block w-full px-3 py-1.5 text-left text-xs hover:bg-accent",
                      s === batchStart ? "text-primary" : "text-popover-foreground/80",
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
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter episodes…"
            className="w-full rounded-md border border-border bg-muted py-1.5 pl-8 pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
          />
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
          {([
            { mode: "list",  Icon: LayoutList },
            { mode: "grid",  Icon: LayoutGrid },
            { mode: "image", Icon: ImageIcon },
          ] as const).map(({ mode, Icon }) => (
            <button
              key={mode}
              onClick={() => changeView(mode)}
              aria-label={mode}
              className={[
                "rounded-md p-1.5 transition-colors",
                viewMode === mode
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {/* List view */}
      {viewMode === "list" && (
        <div className="max-h-[560px] overflow-y-auto divide-y divide-border">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No episodes match.</p>
          ) : filtered.map((n) => {
            const meta    = metaByNum.get(n);
            const title   = meta?.title && meta.title !== `Episode ${n}` ? meta.title : null;
            const airDate = formatAirDate(meta?.airDate);

            return (
              <Link
                key={n}
                href={`/watch/${animeId}?ep=${n}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/40"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-bold text-secondary-foreground">
                  {n}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">
                    {title ?? `Episode ${n}`}
                  </p>
                  {airDate && (
                    <p className="text-[11px] text-muted-foreground">{airDate}</p>
                  )}
                </div>
                <Play className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}

      {/* Grid view */}
      {viewMode === "grid" && (
        <div className="max-h-[560px] overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No episodes match.</p>
          ) : (
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
              {filtered.map((n) => (
                <Link
                  key={n}
                  href={`/watch/${animeId}?ep=${n}`}
                  className="flex items-center justify-center rounded-lg py-2.5 text-sm font-bold transition-colors bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                >
                  {n}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Image view */}
      {viewMode === "image" && (
        <div className="max-h-[560px] overflow-y-auto divide-y divide-border">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No episodes match.</p>
          ) : filtered.map((n) => {
            const meta    = metaByNum.get(n);
            const thumb   = meta?.thumbnail ?? meta?.image ?? null;
            const title   = meta?.title && meta.title !== `Episode ${n}` ? meta.title : `Episode ${n}`;
            const airDate = formatAirDate(meta?.airDate);

            return (
              <Link
                key={n}
                href={`/watch/${animeId}?ep=${n}`}
                className="flex w-full text-left transition-colors hover:bg-accent/40"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-[42%] shrink-0 overflow-hidden bg-muted">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-muted">
                      <ImageIcon className="size-6 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/75 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                    EP {n}
                  </span>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary shadow-lg">
                      <Play className="size-4 translate-x-px fill-primary-foreground text-primary-foreground" />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-3">
                  <p className="line-clamp-1 text-sm font-bold leading-tight text-foreground">
                    {title}
                  </p>
                  {airDate && (
                    <p className="mt-auto text-[10px] text-muted-foreground">{airDate}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
