"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Flag, Share2, Bookmark, ThumbsUp,
  ChevronLeft, ChevronRight, AlertTriangle, ListVideo, Loader2,
} from "lucide-react";
import { VideoPlayer } from "./video-player";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { cn, preferredTitle } from "@/lib/utils";
import { AnimeRow } from "@/components/anime/anime-row";
import { EpisodeList } from "@/features/anime/episode-list";
import { Comments } from "@/features/anime/comments";
import { useStream, useEpisodes } from "@/features/anime/use-anime";
import { usePlayerStore } from "@/store/player-store";
import { useHistoryStore } from "@/store/history-store";
import { useWatchlistStore } from "@/store/watchlist-store";
import { toCardFromDetail } from "@/lib/to-card";
import type { AnimeDetail } from "@/types/anime";

// User-facing server names → Anivexa provider IDs (see consumet.ts)
const SERVERS = ["Kiwi", "Ally", "Bee", "Hop", "Bonk"] as const;

type SeasonEntry = { id: string; slug: string; title: { english?: string | null; romaji?: string | null } };

export function WatchView({ detail, seasonChain, initialEp }: { detail: AnimeDetail; seasonChain: SeasonEntry[]; initialEp: number }) {
  const router = useRouter();
  const ep = initialEp;

  const category  = usePlayerStore((s) => s.category);
  const server    = usePlayerStore((s) => s.server);
  const setSettings = usePlayerStore((s) => s.setSettings);
  const showComments = usePlayerStore((s) => s.showComments);
  const episodeLayout = usePlayerStore((s) => s.episodeLayout);
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);

  const { data: stream, isLoading: streamLoading, isError } = useStream(detail.id, ep, category, server);
  const { data: episodes } = useEpisodes(detail.id);
  const total = episodes?.length ?? detail.episodes ?? 1;

  const upsert  = useHistoryStore((s) => s.upsert);
  const toggleFavorite = useWatchlistStore((s) => s.toggleFavorite);
  const setStatus = useWatchlistStore((s) => s.setStatus);
  const card = useMemo(() => toCardFromDetail(detail), [detail]);

  // Track exact playback position so sub/dub/server switches resume at the right time.
  // Read history synchronously so startTime is correct on the very first render —
  // avoids the race where a cached stream mounts VideoPlayer before any useEffect fires.
  const [startTime, setStartTime] = useState(() => {
    const saved = useHistoryStore.getState().getFor(detail.id);
    return saved && saved.episode === ep ? saved.progress : 0;
  });
  const savedTimeRef = useRef(startTime);
  const episodeThumbnailRef = useRef<string | null | undefined>(null);

  // When the episode changes, re-seed from history (or reset to 0 for unseen episodes)
  useEffect(() => {
    const saved = useHistoryStore.getState().getFor(detail.id);
    const resume = saved && saved.episode === ep ? saved.progress : 0;
    setStartTime(resume);
    savedTimeRef.current = resume;
  }, [ep, detail.id]);

  const goToEp = useCallback(
    (n: number) => {
      if (n < 1 || n > total) return;
      router.push(`/watch/${detail.slug}?ep=${n}`);
    },
    [router, detail.slug, total]
  );

  const onProgress = useCallback(
    (current: number, duration: number) => {
      // Always keep an up-to-date position for sub/dub resumption
      savedTimeRef.current = current;
      // Throttle the expensive history-store write to every ~5 seconds
      if (Math.floor(current) % 5 !== 0) return;
      upsert({ anime: card, episode: ep, progress: current, duration, episodeThumbnail: episodeThumbnailRef.current });
      if (current / duration > 0.9) setStatus(card, "WATCHING");
    },
    [upsert, card, ep, setStatus]
  );

  const switchCategory = useCallback(
    (c: "sub" | "dub") => {
      if (c === category) return;
      // Snapshot the current position before the source swaps
      setStartTime(savedTimeRef.current);
      setSettings({ category: c });
    },
    [category, setSettings]
  );

  const switchServer = useCallback(
    (s: typeof server) => {
      if (s === server) return;
      setStartTime(savedTimeRef.current);
      setSettings({ server: s });
    },
    [server, setSettings]
  );

  const title = preferredTitle(detail.title, titleLanguage);
  const episodeMeta = episodes?.find((e) => e.number === ep);
  episodeThumbnailRef.current = episodeMeta?.thumbnail;

  // Complete season chain is built server-side via BFS traversal of AniList relations.
  // Using the pre-built chain ensures all seasons are always visible from any season page.
  const seasons = useMemo(() => {
    if (seasonChain.length <= 1) return [];
    return seasonChain.map((s, i) => ({
      label: `Season ${i + 1}: ${s.title.english ?? s.title.romaji ?? `Season ${i + 1}`}`,
      value: s.id === detail.id
        ? `/watch/${detail.slug}?ep=${ep}`
        : `/watch/${s.slug}?ep=1`,
    }));
  }, [seasonChain, detail.id, detail.slug, ep]);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-6">
      {/* On desktop: 2-column grid. On mobile: single column, sidebar renders between info and recs. */}
      <div className="grid gap-5 xl:grid-cols-[1fr_400px] xl:items-start">

        {/* ── Left: player + controls + info ── */}
        <div className="min-w-0 space-y-4">
          {streamLoading ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-card">
              {episodeMeta?.thumbnail && (
                <img src={episodeMeta.thumbnail} alt="" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="size-10 animate-spin text-white" />
              </div>
            </div>
          ) : isError || !stream ? (
            <div className="grid aspect-video w-full place-items-center rounded-xl border border-border bg-card text-center">
              <div className="space-y-2 text-muted-foreground">
                <AlertTriangle className="mx-auto size-10" />
                <p>Couldn&apos;t load this stream. Try another server.</p>
              </div>
            </div>
          ) : (
            <VideoPlayer
              stream={stream}
              poster={episodeMeta?.thumbnail ?? detail.coverImage}
              intro={stream.intro}
              outro={stream.outro}
              onNext={ep < total ? () => goToEp(ep + 1) : undefined}
              onPrev={ep > 1 ? () => goToEp(ep - 1) : undefined}
              onProgress={onProgress}
              startTime={startTime}
            />
          )}

          {/* Server / category bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
              {(["sub", "dub"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => switchCategory(c)}
                  className={`rounded-md px-3 py-1 text-sm font-medium uppercase transition ${
                    category === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">Server:</span>
            <div className="flex flex-wrap gap-1.5">
              {SERVERS.map((s) => (
                <button key={s} onClick={() => switchServer(s)}>
                  <Badge variant={server === s ? "default" : "secondary"} className="cursor-pointer">
                    {s}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Episode info */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/anime/${detail.slug}`} className="text-sm text-primary hover:underline">
                  {title}
                </Link>
                <h1 className="text-xl font-bold">
                  Episode {ep}
                  {episodeMeta?.title && episodeMeta.title !== `Episode ${ep}`
                    ? `: ${episodeMeta.title}`
                    : ""}
                </h1>
              </div>
              <div className="flex gap-1.5">
                <Button variant="glass" size="sm" disabled={ep <= 1} onClick={() => goToEp(ep - 1)}>
                  <ChevronLeft className="size-4" /> Prev
                </Button>
                <Button variant="glass" size="sm" disabled={ep >= total} onClick={() => goToEp(ep + 1)}>
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            {episodeMeta?.description && (
              <p className="text-sm text-muted-foreground">{episodeMeta.description}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm"><ThumbsUp className="size-4" /> Like</Button>
              <Button variant="secondary" size="sm" onClick={() => toggleFavorite(card)}>
                <Bookmark className="size-4" /> Bookmark
              </Button>
              <Button
                variant="secondary" size="sm"
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
              >
                <Share2 className="size-4" /> Share
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Flag className="size-4" /> Report
              </Button>
            </div>
          </div>

          {/* Recommendations + comments — below episode list on mobile (sidebar renders first via grid order) */}
          {detail.recommendations.length > 0 && (
            <div className="pt-2">
              <AnimeRow title="You might also like" items={detail.recommendations} />
            </div>
          )}

          {showComments && (
            <div className="pt-2">
              <Comments />
            </div>
          )}
        </div>

        {/* ── Right: episodes (+ season selector in header) ── */}
        <aside className="space-y-4 xl:sticky xl:top-20">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold">
                <ListVideo className="size-4 text-primary" /> Episodes
              </h2>
              {seasons.length > 1 && (
                <Select
                  value={`/watch/${detail.slug}?ep=${ep}`}
                  onChange={(e) => router.push(e.target.value)}
                  options={seasons.map((s) => ({ label: s.label, value: s.value }))}
                />
              )}
            </div>
            <EpisodeList
              animeId={detail.id}
              slug={detail.slug}
              layout={episodeLayout}
              currentEpisode={ep}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
