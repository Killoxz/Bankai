"use client";

import { useState, useEffect, ReactNode } from "react";
import { useTheme } from "next-themes";
import { Flame, TrendingUp, Clock, Star, Sparkles, Film, Tv, Calendar, Plus, ChevronLeft, ChevronRight, Trophy, Monitor, Sun, Moon, Cat, Languages, Library } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePlayerStore } from "@/store/player-store";
import { useWatchlistStore } from "@/store/watchlist-store";
import { HeroCarousel } from "@/components/anime/hero-carousel";
import { AnimeRow } from "@/components/anime/anime-row";
import { AnimeCard } from "@/components/anime/anime-card";
import { GenreRow } from "@/components/anime/genre-row";
import { ContinueWatching } from "./continue-watching";
import { preferredTitle } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { HomeSections } from "@/services/providers/types";
import type { AnimeCard as TAnimeCard } from "@/types/anime";

interface Props {
  sections: HomeSections;
  genres: string[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/* ── Sidebar list item ─────────────────────────────────────── */
function SidebarAnimeItem({ anime }: { anime: TAnimeCard; rank: number }) {
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);
  const setStatus = useWatchlistStore((s) => s.setStatus);
  const isAiring = anime.status === "RELEASING";
  const score = anime.averageScore ? Math.round(anime.averageScore / 10) : null;

  return (
    <div className="group relative flex items-center overflow-hidden">
      {/* Banner background — grayscale by default, full color on hover */}
      {anime.bannerImage && (
        <div className="pointer-events-none absolute inset-0">
          <Image src={anime.bannerImage} alt="" fill sizes="288px" className="object-cover opacity-20 grayscale transition-all duration-500 group-hover:opacity-30 group-hover:grayscale-0" />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/70 to-transparent" />
        </div>
      )}

      {/* Clickable area: cover + info */}
      <Link href={`/anime/${anime.slug}`} className="relative z-10 flex flex-1 items-center gap-3 px-3 py-2.5">
        <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg shadow-md">
          <Image src={anime.coverImage} alt="" fill className="object-cover" sizes="44px" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isAiring && <span className="size-1.5 shrink-0 rounded-full bg-green-400" />}
            <p className="line-clamp-2 text-xs font-semibold leading-tight">
              {preferredTitle(anime.title, titleLanguage)}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            {anime.format && <span>{anime.format}</span>}
            {anime.seasonYear && <span className="flex items-center gap-0.5"><Calendar className="size-2.5" />{anime.seasonYear}</span>}
            {anime.episodes && <span className="flex items-center gap-0.5"><Tv className="size-2.5" />{anime.episodes}</span>}
            {score && <span className="flex items-center gap-0.5"><Star className="size-2.5 fill-amber-400 text-amber-400" />{score}</span>}
          </div>
        </div>
      </Link>

      {/* Watchlist "+" button */}
      <button
        onClick={() => setStatus(anime, "PLAN_TO_WATCH")}
        aria-label="Add to watchlist"
        className="relative z-10 mr-2 grid size-7 shrink-0 place-items-center rounded-full border border-border bg-card/80 text-foreground opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 hover:border-primary hover:bg-primary hover:text-primary-foreground"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

/* ── Right sidebar ─────────────────────────────────────────── */
/* ── Sidebar quick-settings dock ───────────────────────────── */
function SidebarQuickSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);
  const homeLayout   = usePlayerStore((s) => s.homeLayout ?? "classic");
  const setSettings  = usePlayerStore((s) => s.setSettings);

  const cycleLayout   = () => setSettings({ homeLayout: homeLayout === "classic" ? "compact" : "classic" });
  const cycleLanguage = () => {
    const langs = ["romaji", "english", "native"] as const;
    setSettings({ titleLanguage: langs[(langs.indexOf(titleLanguage) + 1) % langs.length] });
  };

  const iconBtn = "grid size-9 place-items-center rounded-xl transition-colors text-muted-foreground hover:bg-accent hover:text-foreground";
  const activeBtn = "grid size-9 place-items-center rounded-xl bg-primary/15 text-primary";

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-2 py-2">
      <button onClick={cycleLayout} title="Toggle layout" className={iconBtn}>
        <Monitor className="size-4" />
      </button>
      <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme" className={iconBtn}>
        {mounted ? (theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />) : <Moon className="size-4" />}
      </button>
      {/* Cat — second logo / brand mark */}
      <div title="Bankai" className={activeBtn}>
        <Cat className="size-4" />
      </div>
      <button onClick={cycleLanguage} title={`Title: ${titleLanguage}`} className={iconBtn}>
        <Languages className="size-4" />
      </button>
      <button title="Library" className={iconBtn}>
        <Library className="size-4" />
      </button>
    </div>
  );
}

const SCHEDULE_TIMES = ["02:30", "03:00", "03:30", "04:00", "04:30", "09:16", "09:30", "21:00"] as const;

/* ── Airing Schedule (standalone — lives in the bottom grid) ── */
function AiringScheduleSection({ trending }: { trending: TAnimeCard[] }) {
  const todayIdx = new Date().getDay();
  const [activeDay, setActiveDay] = useState(todayIdx);
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Estimated</p>
        <h3 className="text-2xl font-bold leading-tight">Airing Schedule</h3>
      </div>
      <div className="flex items-baseline overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {DAYS.map((day, i) => (
          <button key={day} onClick={() => setActiveDay(i)} className="flex shrink-0 items-baseline focus:outline-none">
            <span className={cn("font-bold transition-all duration-200", activeDay === i ? "text-2xl text-foreground" : "text-base text-muted-foreground/40 hover:text-muted-foreground/70")}>{day}</span>
            <span className="mx-1 select-none text-lg text-muted-foreground/25">/</span>
          </button>
        ))}
      </div>
      <p className="px-4 pb-3 text-xs text-muted-foreground">
        {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </p>
      <div className="relative ml-4 border-l border-primary/40 pb-2">
        {(() => {
          const offset = (activeDay * 3) % Math.max(trending.length - 5, 1);
          const items = trending.slice(offset, offset + 8);
          const nowHour = new Date().getHours();
          if (items.length === 0)
            return <p className="py-6 pl-4 text-xs text-muted-foreground">No schedule data</p>;
          return items.map((anime, i) => {
            const time = SCHEDULE_TIMES[i % SCHEDULE_TIMES.length];
            const isEstimated = activeDay !== todayIdx || Number(time.split(":")[0]) > nowHour;
            return (
              <div key={anime.id} className={cn("flex items-center gap-2 py-2.5 pl-3 pr-4", isEstimated ? "opacity-40" : "")}>
                <span className="w-9 shrink-0 text-[11px] tabular-nums text-muted-foreground">{time}</span>
                <span className="flex-1 truncate text-[13px]">{preferredTitle(anime.title, titleLanguage)}</span>
                <span className="shrink-0 rounded border border-border/60 px-1.5 py-px text-[10px] tabular-nums text-muted-foreground">EP {anime.episodes ?? i + 1}</span>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}

function ClassicSidebar({ trending, upcoming }: { trending: TAnimeCard[]; upcoming: TAnimeCard[] }) {

  return (
    <aside className="flex flex-col gap-4">
      {/* Top Airing */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Flame className="size-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Top Airing</h3>
        </div>
        <div className="divide-y divide-border/50 py-1">
          {trending.slice(0, 5).map((anime, i) => (
            <SidebarAnimeItem key={anime.id} anime={anime} rank={i + 1} />
          ))}
        </div>
      </div>

      {/* Upcoming */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Sparkles className="size-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Upcoming</h3>
        </div>
        <div className="divide-y divide-border/50 py-1">
          {upcoming.slice(0, 6).map((anime, i) => (
            <SidebarAnimeItem key={anime.id} anime={anime} rank={i + 1} />
          ))}
        </div>
      </div>

    </aside>
  );
}

/* ── Social sharing banner ──────────────────────────────────── */
function SocialBanner() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/50">
        <span className="text-sm font-black text-primary-foreground">B</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Love the Site?</p>
        <p className="text-xs text-muted-foreground">Share it With your Friends!</p>
      </div>
      <div className="flex items-center gap-2">
        <a href="#" aria-label="Reddit" className="grid size-8 place-items-center rounded-full bg-orange-500/15 text-orange-400 transition-colors hover:bg-orange-500/25">
          <svg viewBox="0 0 24 24" className="size-4 fill-current"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
        </a>
        <a href="#" aria-label="Discord" className="grid size-8 place-items-center rounded-full bg-indigo-500/15 text-indigo-400 transition-colors hover:bg-indigo-500/25">
          <svg viewBox="0 0 24 24" className="size-4 fill-current"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.102 18.08.114 18.1.136 18.116a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
        </a>
        <a href="#" aria-label="X" className="grid size-8 place-items-center rounded-full bg-foreground/10 text-foreground transition-colors hover:bg-foreground/20">
          <svg viewBox="0 0 24 24" className="size-3.5 fill-current"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 7.184 6.063-7.184Zm-1.161 19.52h2.04L6.322 2.792H4.14L17.74 20.673z"/></svg>
        </a>
      </div>
    </div>
  );
}

/* ── TOP AIRING large card ──────────────────────────────────── */
function AiringItem({ anime }: { anime: TAnimeCard }) {
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);
  const isAiring = anime.status === "RELEASING";
  const score = anime.averageScore ? Math.round(anime.averageScore / 10) : null;

  return (
    <Link href={`/anime/${anime.slug}`} className="group relative flex h-[88px] overflow-hidden">
      {anime.bannerImage && (
        <div className="pointer-events-none absolute inset-0">
          <Image src={anime.bannerImage} alt="" fill sizes="320px" className="object-cover opacity-20 grayscale transition-all duration-500 group-hover:opacity-30 group-hover:grayscale-0" />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/70 to-transparent" />
        </div>
      )}
      <div className="relative z-10 h-full w-[68px] shrink-0 overflow-hidden">
        <Image src={anime.coverImage} alt="" fill className="object-cover" sizes="68px" />
      </div>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-1 px-3">
        <div className="flex items-start gap-1.5">
          {isAiring && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-green-400" />}
          <p className="line-clamp-2 text-sm font-semibold leading-snug">
            {preferredTitle(anime.title, titleLanguage)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          {anime.format && <span>{anime.format}</span>}
          {anime.seasonYear && <span className="flex items-center gap-0.5"><Calendar className="size-2.5" />{anime.seasonYear}</span>}
          {anime.episodes && <span className="flex items-center gap-0.5"><Tv className="size-2.5" />{anime.episodes}</span>}
          {score && <span className="flex items-center gap-0.5"><Star className="size-2.5 fill-amber-400 text-amber-400" />{score}</span>}
        </div>
      </div>
    </Link>
  );
}

/* ── Sidebar-style section (reusable for bottom panels) ────── */
function SidebarStyleSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ReactNode;
  items: TAnimeCard[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {icon}
        <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
      </div>
      <div className="divide-y divide-border/50 py-1">
        {items.map((anime, i) => (
          <SidebarAnimeItem key={anime.id} anime={anime} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}

/* ── Tabbed grid ───────────────────────────────────────────── */
const TABS = [
  { label: "Newest",    key: "recentlyUpdated" },
  { label: "Popular",   key: "popular"         },
  { label: "Top Rated", key: "topRated"        },
] as const;
type TabKey = (typeof TABS)[number]["key"];
const ITEMS_PER_PAGE = 12; // 4 cols × 3 rows
const MAX_PAGES = 7;

function TabbedGrid({ sections }: { sections: HomeSections }) {
  const [tab, setTab] = useState<TabKey>("recentlyUpdated");
  const [page, setPage] = useState(0);

  const items = (sections[tab] ?? []).slice(0, ITEMS_PER_PAGE * MAX_PAGES);
  const maxPage = Math.max(0, Math.ceil(items.length / ITEMS_PER_PAGE) - 1);
  const pageItems = items.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const switchTab = (t: TabKey) => { setTab(t); setPage(0); };

  return (
    <div className="space-y-4">
      <SocialBanner />

      {/* Tab bar + pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-semibold transition-all",
                tab === t.key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="grid size-7 place-items-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[1.5ch] text-center text-sm font-semibold tabular-nums">
            {page + 1}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            disabled={page >= maxPage}
            className="grid size-7 place-items-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {pageItems.map((anime, i) => (
          <AnimeCard key={anime.id} anime={anime} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ── Main export ───────────────────────────────────────────── */
export function HomeLayout({ sections, genres }: Props) {
  const homeLayout = usePlayerStore((s) => s.homeLayout ?? "classic");
  const { trending, popular, topRated, recentlyUpdated, upcoming, movies, tv } = sections;

  if (homeLayout === "compact") {
    return (
      <div className="space-y-6 sm:space-y-8">
        <GenreRow genres={genres} />
        <ContinueWatching />
        <AnimeRow title="Trending Today"    icon={<Flame      className="size-5 text-primary" />} items={trending}        href="/trending" />
        <AnimeRow title="Popular This Week" icon={<TrendingUp className="size-5 text-primary" />} items={popular}         href="/browse?sort=POPULARITY_DESC" />
        <AnimeRow title="Recently Updated"  icon={<Clock      className="size-5 text-primary" />} items={recentlyUpdated} href="/browse?sort=UPDATED_AT_DESC" />
        <AnimeRow title="Top Rated"         icon={<Star       className="size-5 text-primary" />} items={topRated}        href="/browse?sort=SCORE_DESC" />
        <AnimeRow title="Upcoming"          icon={<Sparkles   className="size-5 text-primary" />} items={upcoming}        href="/browse?status=NOT_YET_RELEASED" />
        <AnimeRow title="Movies"            icon={<Film       className="size-5 text-primary" />} items={movies}          href="/browse?format=MOVIE" />
        <AnimeRow title="TV Shows"          icon={<Tv         className="size-5 text-primary" />} items={tv}              href="/browse?format=TV" />
      </div>
    );
  }

  if (homeLayout === "spotlight") {
    return (
      <div className="space-y-10 sm:space-y-14">
        <div className="-mx-3 sm:-mx-6">
          <HeroCarousel items={trending.slice(0, 8)} />
        </div>
        <ContinueWatching />
        <AnimeRow title="Trending Today"    icon={<Flame      className="size-5 text-primary" />} items={trending}  href="/trending" />
        <AnimeRow title="Popular This Week" icon={<TrendingUp className="size-5 text-primary" />} items={popular}   href="/browse?sort=POPULARITY_DESC" />
        <AnimeRow title="Top Rated"         icon={<Star       className="size-5 text-primary" />} items={topRated}  href="/browse?sort=SCORE_DESC" />
        <AnimeRow title="Movies"            icon={<Film       className="size-5 text-primary" />} items={movies}    href="/browse?format=MOVIE" />
      </div>
    );
  }

  if (homeLayout === "classic") {
    return (
      <div className="space-y-6">
        {/* Hero — full width above everything */}
        <HeroCarousel items={trending.slice(0, 6)} />

        {/* Full-width sections above the sidebar */}
        <GenreRow genres={genres} />
        <ContinueWatching />

        {/* Tabbed grid + sidebar — sidebar naturally fills its height */}
        <div className="grid gap-6 items-start xl:grid-cols-[1fr_256px]">
          <TabbedGrid sections={sections} />
          <ClassicSidebar trending={trending} upcoming={upcoming} />
        </div>

        {/* Bottom sections — full width so no blank gap on the right */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SidebarStyleSection
            title="Just Finished"
            icon={<Trophy className="size-4 text-primary" />}
            items={recentlyUpdated.filter((a) => a.status === "FINISHED").slice(0, 6).concat(
              topRated.filter((a) => a.status === "FINISHED")
            ).slice(0, 6)}
          />
          <SidebarStyleSection
            title="Top Movies"
            icon={<Film className="size-4 text-primary" />}
            items={movies.slice(0, 6)}
          />
          <div className="sm:col-span-2 lg:col-span-1">
            <AiringScheduleSection trending={trending} />
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div className="space-y-8 sm:space-y-10">
      <HeroCarousel items={trending.slice(0, 6)} />
      <GenreRow genres={genres} />
      <ContinueWatching />
      <AnimeRow title="Trending Today"    icon={<Flame      className="size-5 text-primary" />} items={trending}        href="/trending" />
      <AnimeRow title="Popular This Week" icon={<TrendingUp className="size-5 text-primary" />} items={popular}         href="/browse?sort=POPULARITY_DESC" />
      <AnimeRow title="Recently Updated"  icon={<Clock      className="size-5 text-primary" />} items={recentlyUpdated} href="/browse?sort=UPDATED_AT_DESC" />
      <AnimeRow title="Top Rated"         icon={<Star       className="size-5 text-primary" />} items={topRated}        href="/browse?sort=SCORE_DESC" />
      <AnimeRow title="Upcoming"          icon={<Sparkles   className="size-5 text-primary" />} items={upcoming}        href="/browse?status=NOT_YET_RELEASED" />
      <AnimeRow title="Movies"            icon={<Film       className="size-5 text-primary" />} items={movies}          href="/browse?format=MOVIE" />
      <AnimeRow title="TV Shows"          icon={<Tv         className="size-5 text-primary" />} items={tv}              href="/browse?format=TV" />
    </div>
  );
}
