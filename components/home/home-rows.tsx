"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AnimeRow } from "./anime-row";
import { ScrollRow } from "./scroll-row";
import { useAuthStore } from "@/store/auth-store";
import { ANIME_GENRES, type AnimeMedia } from "@/lib/anilist";

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

function ContinueWatchingCard({
  entry,
  index,
  onDismiss,
}: {
  entry: HistoryEntry;
  index: number;
  onDismiss: (animeId: string) => void;
}) {
  const anilistId = entry.animeId.replace("anilist:", "");
  const href      = `/watch/${anilistId}?ep=${entry.episodeNumber}`;
  const pct       = entry.duration > 0
    ? Math.min(100, Math.round((entry.progress / entry.duration) * 100))
    : 0;
  const anime   = entry.Anime!;
  // Prefer episode thumbnail → anime banner → anime cover
  const bgImage = entry.episodeThumbnail ?? anime.bannerImage ?? anime.coverImage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className="relative flex-shrink-0 w-[260px]"
    >
      <Link href={href} className="group block">
        <motion.div
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.2 }}
          className="relative aspect-video overflow-hidden rounded-xl bg-white/5"
        >
          {bgImage && (
            <Image
              src={bgImage}
              alt={anime.title}
              fill
              sizes="260px"
              className="object-cover"
            />
          )}

          {/* Dark gradient at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Dismiss button — inside card, top-right */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(entry.animeId); }}
            className="absolute right-1.5 top-1.5 z-10 grid size-6 place-items-center rounded-full bg-black/60 text-white/70 shadow backdrop-blur-sm transition-colors hover:bg-black/85 hover:text-white"
            aria-label="Remove"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-3">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>

          {/* Hover play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/25">
            <div className="scale-90 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
              <div className="grid size-10 place-items-center rounded-full bg-primary shadow-lg">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 text-black">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* EP badge — bottom left */}
          <span className="absolute bottom-5 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            EP {entry.episodeNumber}
          </span>

          {/* Progress bar */}
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>

          <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/0 transition-all duration-200 group-hover:ring-white/20" />
        </motion.div>

        <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-white/90">
          {anime.title}
        </p>
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
            className={
              g === genre
                ? "flex-shrink-0 whitespace-nowrap rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black"
                : "flex-shrink-0 whitespace-nowrap rounded-full border border-white/25 px-4 py-1.5 text-sm font-medium text-white/75 transition-colors hover:border-white/50 hover:text-white"
            }
          >
            {g}
          </button>
        ))}
      </ScrollRow>

      {/* Continue Watching — uses real history, not profile list */}
      {!watchingLoading && (
        continueItems.length > 0 ? (
          <section>
            <h2 className="mb-4 text-base font-semibold text-white">Continue Watching</h2>
            <ScrollRow className="gap-3 pb-2">
              {continueItems.map((entry, i) => (
                <ContinueWatchingCard key={entry.id} entry={entry} index={i} onDismiss={dismissEntry} />
              ))}
            </ScrollRow>
          </section>
        ) : (
          <section>
            <h2 className="mb-4 text-base font-semibold text-white">Continue Watching</h2>
            <p className="rounded-xl bg-white/5 py-8 text-center text-sm text-white/40">
              {loggedIn
                ? "Nothing here yet — start watching something and it'll appear here."
                : "Log in to see your watch history here."}
            </p>
          </section>
        )
      )}

      <AnimeRow title="New Season" items={season} showBadge />
      <AnimeRow title="Recommended For You" items={recommended} />

      {season.length === 0 && recommended.length === 0 && continueItems.length === 0 && (
        <p className="py-10 text-center text-sm text-white/40">
          Nothing in {genre} right now — try another genre.
        </p>
      )}
    </>
  );
}
