"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AnimeRow } from "./anime-row";
import { ScrollRow } from "./scroll-row";
import { useAuthStore } from "@/store/auth-store";
import { useLanguageStore } from "@/store/language-store";
import { ANIME_GENRES, type AnimeMedia } from "@/lib/anilist";
import { useCardAnimation } from "@/hooks/use-card-animation";
import { useSettingsStore } from "@/store/settings-store";

const GENRES = ["All Genres", ...ANIME_GENRES];

// ── Continue Watching types ──────────────────────────────────────────────────

interface HistoryEntry {
  id: string;
  animeId: string;
  episodeNumber: number;
  progress: number;
  duration: number;
  completed: boolean;
  watchedAt: string;
  episodeThumbnail: string | null;
  Anime: {
    id: string;
    title: string;
    titleNative: string | null;
    coverImage: string | null;
    bannerImage: string | null;
    episodes: number | null;
    format: string | null;
    seasonYear: number | null;
    genres: string[];
  } | null;
}

function useContinueWatching() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!currentUser) { setItems([]); setLoading(false); return; }
    setLoading(true);
    fetch(`/api/history?username=${encodeURIComponent(currentUser)}`)
      .then((r) => r.json())
      .then((json) => {
        const history: HistoryEntry[] = json?.history ?? [];
        // Deduplicate by anime — history is already sorted by watchedAt desc
        const seen = new Map<string, HistoryEntry>();
        for (const e of history) {
          if (!e.completed && e.Anime?.coverImage && !seen.has(e.animeId)) {
            seen.set(e.animeId, e);
          }
        }
        setItems(Array.from(seen.values()).slice(0, 20));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [mounted, currentUser]);

  return { items, setItems, loading, loggedIn: mounted && !!currentUser };
}

function fmtDuration(seconds: number): string {
  if (!seconds) return "";
  return `${Math.floor(seconds / 60)} min`;
}

function fmtTimestamp(seconds: number): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const CW_WIDTHS = {
  small:  "w-[160px] sm:w-[200px]",
  medium: "w-[200px] sm:w-[260px]",
  large:  "w-[240px] sm:w-[300px]",
} as const;

function ContinueWatchingCard({
  entry,
  index,
  onDismiss,
  cardSize = "medium",
}: {
  entry: HistoryEntry;
  index: number;
  onDismiss: (animeId: string) => void;
  cardSize?: "small" | "medium" | "large";
}) {
  const anilistId = entry.animeId.replace("anilist:", "");
  const href      = `/watch/${anilistId}?ep=${entry.episodeNumber}`;
  const pct       = entry.duration > 0
    ? Math.min(100, Math.round((entry.progress / entry.duration) * 100))
    : 0;
  const anime        = entry.Anime!;
  const bgImage      = entry.episodeThumbnail ?? anime.bannerImage ?? anime.coverImage;
  const titleLang    = useLanguageStore((s) => s.titleLanguage);
  const displayTitle = titleLang === "native"
    ? (anime.titleNative ?? anime.title)
    : anime.title;

  const { wrapRef, cardRef, glareRef, onMove, onLeave } = useCardAnimation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className={`relative flex-shrink-0 ${CW_WIDTHS[cardSize]}`}
    >
      <Link href={href} className="group block">
        <div ref={wrapRef} onMouseMove={onMove} onMouseLeave={onLeave} style={{ perspective: "700px" }}>
          <div
            ref={cardRef}
            className="relative aspect-video overflow-hidden rounded-xl bg-gray-200 dark:bg-white/5"
            style={{
              transformStyle: "preserve-3d",
              transition:     "transform 0.12s ease-out, box-shadow 0.12s ease-out",
              willChange:     "transform",
            }}
          >
            {bgImage && (
              <Image
                src={bgImage}
                alt={anime.title}
                fill
                sizes="(max-width: 640px) 200px, 260px"
                className="object-cover"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(entry.animeId); }}
              className="absolute right-1.5 top-1.5 z-10 grid size-6 place-items-center rounded-full bg-black/60 text-white/70 shadow backdrop-blur-sm transition-colors hover:bg-black/85 hover:text-white"
              aria-label="Remove"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-3">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>

            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/25">
              <div className="scale-90 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                <div className="grid size-10 place-items-center rounded-full bg-primary shadow-lg">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 text-black">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Bottom info row */}
            <div className="absolute inset-x-0 bottom-4 flex items-end justify-between px-2">
              <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                EP {entry.episodeNumber}
              </span>
              {entry.duration > 0 && (
                <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
                  {fmtDuration(entry.duration)}
                </span>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>

            {/* Glare */}
            <div
              ref={glareRef}
              className="pointer-events-none absolute inset-0 z-10 rounded-xl"
              style={{ opacity: 0, transition: "opacity 0.25s ease-out" }}
            />

            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/0 transition-all duration-200 group-hover:ring-white/20" />
          </div>
        </div>

        <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-card-foreground group-hover:text-foreground">
          {displayTitle}
        </p>
        {entry.progress > 0 && entry.duration > 0 && (
          <p className="mt-0.5 text-[10px] text-white/35">
            Left at {fmtTimestamp(entry.progress)} / {fmtTimestamp(entry.duration)}
          </p>
        )}
      </Link>
    </motion.div>
  );
}

// ── HomeRows ─────────────────────────────────────────────────────────────────

export function HomeRows({
  newSeason,
  topRated,
}: {
  newSeason: AnimeMedia[];
  topRated: AnimeMedia[];
}) {
  const [genre, setGenre] = useState("All Genres");
  const byGenre = (list: AnimeMedia[]) =>
    genre === "All Genres" ? list : list.filter((a) => a.genres.includes(genre));

  const { items: continueItems, setItems: setContinueItems, loading: watchingLoading, loggedIn } = useContinueWatching();
  const showWatchHistory = useSettingsStore((s) => s.showWatchHistory);
  const cardSize         = useSettingsStore((s) => s.cardSize);

  const season      = byGenre(newSeason);
  const recommended = byGenre(topRated);

  const currentUser = useAuthStore((s) => s.currentUser);

  function dismissEntry(animeId: string) {
    setContinueItems((prev) => prev.filter((e) => e.animeId !== animeId));
    if (!currentUser) return;
    fetch(`/api/history?username=${encodeURIComponent(currentUser)}&animeId=${encodeURIComponent(animeId)}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  return (
    <>
      <ScrollRow className="items-center gap-2 pb-1">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g === genre ? "All Genres" : g)}
            style={{ touchAction: "manipulation" }}
            className={
              g === genre
                ? "flex-shrink-0 whitespace-nowrap rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background"
                : "flex-shrink-0 whitespace-nowrap rounded-full border border-gray-300 dark:border-white/25 px-4 py-1.5 text-sm font-medium text-gray-600 dark:text-white/75 transition-colors hover:border-gray-400 dark:hover:border-white/50 hover:text-gray-900 dark:hover:text-white"
            }
          >
            {g}
          </button>
        ))}
      </ScrollRow>

      {/* Continue Watching — uses real history, not profile list */}
      {!watchingLoading && showWatchHistory && (
        continueItems.length > 0 ? (
          <section>
            <h2 className="mb-4 text-base font-semibold text-foreground">Continue Watching</h2>
            <div className="-mx-4 -my-4">
              <ScrollRow className="gap-3 px-4 py-4">
                {continueItems.map((entry, i) => (
                  <ContinueWatchingCard key={entry.id} entry={entry} index={i} onDismiss={dismissEntry} cardSize={cardSize} />
                ))}
              </ScrollRow>
            </div>
          </section>
        ) : (
          <section>
            <h2 className="mb-4 text-base font-semibold text-foreground">Continue Watching</h2>
            {loggedIn ? (
              <p className="rounded-xl bg-gray-100 dark:bg-white/5 py-8 text-center text-sm text-gray-400 dark:text-white/40">
                Nothing here yet — start watching something and it&apos;ll appear here.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-xl bg-gray-100 dark:bg-white/5 py-8 text-center">
                <p className="text-sm text-gray-500 dark:text-white/40">Log in to see your watch history on any device.</p>
                <Link
                  href="/login"
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                >
                  Log In
                </Link>
              </div>
            )}
          </section>
        )
      )}

      <AnimeRow title="New Season" items={season} showBadge />
      <AnimeRow title="Recommended For You" items={recommended} />

      {season.length === 0 && recommended.length === 0 && continueItems.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-400 dark:text-white/40">
          Nothing in {genre} right now — try another genre.
        </p>
      )}
    </>
  );
}
