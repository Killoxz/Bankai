"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Info, Star, ChevronLeft, ChevronRight, Flame, TrendingUp, Clock, Sparkles, Film, Tv, Plus, Calendar, ArrowRight, Bookmark } from "lucide-react";
import { usePlayerStore } from "@/store/player-store";
import { useWatchlistStore } from "@/store/watchlist-store";
import { AnimeCard } from "@/components/anime/anime-card";
import { ContinueWatching } from "./continue-watching";
import { preferredTitle, stripHtml, truncate, cn } from "@/lib/utils";
import type { HomeSections } from "@/services/providers/types";
import type { AnimeCard as TAnimeCard } from "@/types/anime";

interface Props {
  sections: HomeSections;
  genres: string[];
}

/* ── Section header matching Figma style ────────────────────── */
function SectionHeader({
  title,
  accent,
  href,
}: {
  title: string;
  accent?: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
        <Play className="size-4 fill-[#4ade80] text-[#4ade80] shrink-0" />
        <span>
          {accent ? (
            <>
              <span className="text-[#4ade80]">{accent}</span>
              {" "}
              <span>{title}</span>
            </>
          ) : (
            title
          )}
        </span>
      </h2>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-sm font-medium text-[#4ade80] transition-opacity hover:opacity-80"
        >
          View all <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

/* ── Horizontal anime carousel row ─────────────────────────── */
function EpicAnimeRow({
  title,
  accent,
  items,
  href,
}: {
  title: string;
  accent?: string;
  items: TAnimeCard[];
  href?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) =>
    scroller.current?.scrollBy({ left: dir * 560, behavior: "smooth" });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader title={title} accent={accent} href={href} />
        <div className="flex items-center gap-1.5 sm:ml-4">
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2"
      >
        {items.map((anime, i) => (
          <div key={anime.id} className="w-[44vw] shrink-0 snap-start sm:w-44 md:w-48">
            <EpicAnimeCard anime={anime} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Anime card matching Figma style (poster + Sub|Dub badge) ─ */
function EpicAnimeCard({ anime, index = 0 }: { anime: TAnimeCard; index?: number }) {
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);
  const title = preferredTitle(anime.title, titleLanguage);
  const setStatus = useWatchlistStore((s) => s.setStatus);

  return (
    <div
      className="group relative animate-in fade-in slide-in-from-bottom-3 fill-mode-both"
      style={{ animationDelay: `${Math.min(index * 28, 280)}ms`, animationDuration: "320ms" }}
    >
      <Link href={`/anime/${anime.slug}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white/5">
          {anime.coverImage && (
            <Image
              src={anime.coverImage}
              alt={title}
              fill
              priority={index < 3}
              sizes="(max-width: 640px) 45vw, 200px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Score badge */}
          {anime.averageScore ? (
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              <Star className="size-2.5 fill-amber-400 text-amber-400" />
              {(anime.averageScore / 10).toFixed(1)}
            </div>
          ) : null}

          {/* Play on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="grid size-11 place-items-center rounded-full bg-[#4ade80]/90 text-black shadow-xl">
              <Play className="size-4 translate-x-0.5 fill-current" />
            </div>
          </div>

          {/* Airing indicator */}
          {anime.status === "RELEASING" && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1">
              <span className="size-1.5 animate-pulse rounded-full bg-[#4ade80]" />
              <span className="text-[10px] font-medium text-[#4ade80]">Airing</span>
            </div>
          )}
        </div>

        {/* Info below card */}
        <div className="mt-2 space-y-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white transition-colors group-hover:text-[#4ade80]">
            {title}
          </h3>
          <p className="text-[11px] text-white/40">
            {anime.format?.includes("TV") ? "Series" : anime.format ?? "Anime"} •{" "}
            <span className="text-white/60">Sub | Dub</span>
          </p>
        </div>
      </Link>

      {/* Quick-add watchlist */}
      <button
        onClick={() => setStatus(anime, "PLAN_TO_WATCH")}
        aria-label="Add to watchlist"
        className="absolute right-2 top-2 grid size-7 place-items-center rounded-full border border-white/20 bg-black/60 text-white/60 opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 hover:border-[#4ade80]/60 hover:text-[#4ade80]"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

/* ── Featured show panel (full-width info layout) ───────────── */
function FeaturedShowPanel({ anime }: { anime: TAnimeCard }) {
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);
  const setStatus = useWatchlistStore((s) => s.setStatus);
  const title = preferredTitle(anime.title, titleLanguage);
  const description = truncate(
    stripHtml((anime as { description?: string }).description ?? ""),
    280
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#141418]">
      {/* Background banner image */}
      {(anime.bannerImage || anime.coverImage) && (
        <div className="absolute inset-0">
          <Image
            src={anime.bannerImage || anime.coverImage}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-top opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141418] via-[#141418]/80 to-[#141418]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141418] via-transparent to-transparent" />
        </div>
      )}

      <div className="relative z-10 flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
        {/* Cover art */}
        <div className="relative h-52 w-36 shrink-0 overflow-hidden rounded-xl shadow-2xl sm:h-64 sm:w-44">
          {anime.coverImage && (
            <Image src={anime.coverImage} alt={title} fill className="object-cover" sizes="176px" />
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#4ade80]">
              <Play className="size-3 fill-current" />
              Featured Anime
            </p>
            <h3 className="text-2xl font-black text-white sm:text-3xl">{title}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/50">
              <span>
                {anime.format?.includes("TV") ? "Series" : anime.format ?? "Anime"}
              </span>
              <span className="size-1 rounded-full bg-white/20" />
              <span>Sub | Dub</span>
              {anime.episodes && (
                <>
                  <span className="size-1 rounded-full bg-white/20" />
                  <span>{anime.episodes} Episodes</span>
                </>
              )}
              {anime.averageScore && (
                <>
                  <span className="size-1 rounded-full bg-white/20" />
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star className="size-3 fill-current" />
                    {(anime.averageScore / 10).toFixed(1)}
                  </span>
                </>
              )}
            </div>
          </div>

          {description && (
            <p className="max-w-xl text-sm leading-relaxed text-white/55 line-clamp-4">
              {description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/watch/${anime.slug}?ep=1`}
              className="flex items-center gap-2 rounded-xl bg-[#4ade80] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#4ade80]/90"
            >
              <Play className="size-4 fill-current" />
              Start Watching
            </Link>
            <button
              onClick={() => setStatus(anime, "PLAN_TO_WATCH")}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Bookmark className="size-4" />
              Add to Watchlist
            </button>
            <Link
              href={`/anime/${anime.slug}`}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-transparent px-5 py-2.5 text-sm font-semibold text-white/60 transition hover:text-white"
            >
              <Info className="size-4" />
              More Info
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Large promotional banner ───────────────────────────────── */
function PromoBanner({ anime }: { anime: TAnimeCard }) {
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);
  const title = preferredTitle(anime.title, titleLanguage);

  return (
    <div className="group relative h-56 overflow-hidden rounded-2xl bg-[#141418] sm:h-72">
      {(anime.bannerImage || anime.coverImage) && (
        <Image
          src={anime.bannerImage || anime.coverImage}
          alt={title}
          fill
          sizes="100vw"
          className="object-cover object-top opacity-60 transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4ade80]">
          <Play className="size-3 fill-current" />
          Now Streaming
        </p>
        <h3 className="text-2xl font-black text-white drop-shadow-lg sm:text-3xl">{title}</h3>
        <p className="mt-1 text-sm text-white/50">
          {anime.format?.includes("TV") ? "Series" : anime.format ?? "Anime"} • Sub | Dub
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Link
            href={`/watch/${anime.slug}?ep=1`}
            className="flex items-center gap-2 rounded-xl bg-[#4ade80] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#4ade80]/90"
          >
            <Play className="size-4 fill-current" />
            Watch Now
          </Link>
          <Link
            href={`/anime/${anime.slug}`}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Epic hero (mosaic background + featured carousel) ──────── */
function EpicHero({ items }: { items: TAnimeCard[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);
  const setStatus = useWatchlistStore((s) => s.setStatus);

  const count = Math.min(items.length, 6);

  useEffect(() => {
    if (count <= 1 || paused) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(timerRef.current);
  }, [count, paused, index]);

  if (!count) return null;
  const anime = items[index];
  const title = preferredTitle(anime.title, titleLanguage);
  const description = truncate(stripHtml((anime as { description?: string }).description ?? ""), 180);

  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-[#0a0a0f]"
      style={{ minHeight: "480px", height: "58vh", maxHeight: "680px" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Mosaic grid background */}
      <div className="absolute inset-0 grid grid-cols-4 gap-1 opacity-30 sm:grid-cols-5 lg:grid-cols-6">
        {items.slice(0, 12).map((a, i) => (
          <div
            key={a.id}
            className="relative overflow-hidden"
            style={{
              transform: `rotate(${(i % 3 - 1) * 3}deg) scale(1.08)`,
              transformOrigin: "center",
            }}
          >
            {(a.bannerImage || a.coverImage) && (
              <Image src={a.bannerImage || a.coverImage} alt="" fill sizes="200px" className="object-cover" />
            )}
          </div>
        ))}
      </div>

      {/* Gradient overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/70 to-[#0a0a0f]/40" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/60 via-transparent to-[#0a0a0f]/40" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col">
        {/* Bottom content area */}
        <div className="mt-auto flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:gap-8 sm:p-10">
          {/* Cover art */}
          <div className="relative hidden h-52 w-36 shrink-0 overflow-hidden rounded-xl shadow-2xl sm:block">
            {anime.coverImage && (
              <Image src={anime.coverImage} alt={title} fill className="object-cover" sizes="144px" />
            )}
          </div>

          {/* Text + actions */}
          <div className="flex flex-1 flex-col gap-3">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4ade80]">
              <Play className="size-3 fill-current" />
              Featured Anime Picks
            </p>
            <h1 className="text-3xl font-black text-white drop-shadow-lg sm:text-4xl md:text-5xl">
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/50">
              <span>{anime.format?.includes("TV") ? "Series" : anime.format ?? "Anime"}</span>
              <span className="size-1 rounded-full bg-white/20" />
              <span>Sub | Dub</span>
              {anime.averageScore && (
                <>
                  <span className="size-1 rounded-full bg-white/20" />
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star className="size-3 fill-current" />
                    {(anime.averageScore / 10).toFixed(1)}
                  </span>
                </>
              )}
            </div>
            {description && (
              <p className="hidden max-w-lg text-sm leading-relaxed text-white/50 line-clamp-2 sm:block">
                {description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/watch/${anime.slug}?ep=1`}
                className="flex items-center gap-2 rounded-xl bg-[#4ade80] px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-[#4ade80]/20 transition hover:bg-[#4ade80]/90"
              >
                <Play className="size-4 fill-current" />
                Start Watching
              </Link>
              <button
                onClick={() => setStatus(anime, "PLAN_TO_WATCH")}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                <Bookmark className="size-4" />
                Add to Watchlist
              </button>
            </div>
          </div>

          {/* Slide indicators */}
          {count > 1 && (
            <div className="flex items-center gap-1.5 sm:flex-col sm:items-end sm:self-center">
              {Array.from({ length: count }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setIndex(i); }}
                  aria-label={`Slide ${i + 1}`}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    i === index
                      ? "h-1.5 w-6 bg-[#4ade80]"
                      : "size-1.5 bg-white/25 hover:bg-white/50"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Main export ───────────────────────────────────────────── */
export function HomeLayout({ sections }: Props) {
  const { trending, popular, topRated, recentlyUpdated, upcoming, movies, tv } = sections;

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* 1. Epic Hero */}
      <EpicHero items={trending.slice(0, 8)} />

      {/* 2. Continue Watching (if any) */}
      <ContinueWatching />

      {/* 3. Popular Shows carousel */}
      <EpicAnimeRow
        title="Shows"
        accent="Popular"
        items={popular}
        href="/browse?sort=POPULARITY_DESC"
      />

      {/* 4. Featured show panel */}
      {trending[0] && <FeaturedShowPanel anime={trending[0]} />}

      {/* 5. Trending carousel */}
      <EpicAnimeRow
        title="Today"
        accent="Trending"
        items={trending}
        href="/trending"
      />

      {/* 6. Promo banner */}
      {trending[3] && <PromoBanner anime={trending[3]} />}

      {/* 7. Recently Updated */}
      <EpicAnimeRow
        title="Updated"
        accent="Recently"
        items={recentlyUpdated}
        href="/browse?sort=UPDATED_AT_DESC"
      />

      {/* 8. Top Rated */}
      <EpicAnimeRow
        title="Rated"
        accent="Top"
        items={topRated}
        href="/browse?sort=SCORE_DESC"
      />

      {/* 9. Upcoming */}
      <EpicAnimeRow
        title="Anime"
        accent="Upcoming"
        items={upcoming}
        href="/browse?status=NOT_YET_RELEASED"
      />

      {/* 10. Movies + TV */}
      <div className="grid gap-10 lg:grid-cols-2 sm:gap-14">
        <EpicAnimeRow title="Movies" accent="Anime" items={movies} href="/browse?format=MOVIE" />
        <EpicAnimeRow title="Shows" accent="Top TV" items={tv} href="/browse?format=TV" />
      </div>
    </div>
  );
}
