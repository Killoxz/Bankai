"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Info, Star, ChevronLeft, ChevronRight, Tv, Film, Hash, Clock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { usePlayerStore } from "@/store/player-store";
import {
  cn,
  formatScore,
  formatFormat,
  preferredTitle,
  stripHtml,
  truncate,
} from "@/lib/utils";
import type { AnimeCard } from "@/types/anime";

export function HeroCarousel({ items }: { items: AnimeCard[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const progressRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const INTERVAL = 7000;

  const count = items.length;

  const go = useCallback(
    (dir: number) => {
      setIndex((i) => (i + dir + count) % count);
      setProgress(0);
    },
    [count]
  );

  const goTo = useCallback((i: number) => {
    setIndex(i);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (count <= 1 || paused) return;
    clearInterval(intervalRef.current);
    clearInterval(progressRef.current);
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % count);
      setProgress(0);
    }, INTERVAL);
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + (100 / INTERVAL) * 50, 100));
    }, 50);
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(progressRef.current);
    };
  }, [count, paused, index]);

  const titleLanguage = usePlayerStore((s) => s.titleLanguage);

  if (!count) return null;
  const anime = items[index];
  const title = preferredTitle(anime.title, titleLanguage);
  const description = truncate(
    stripHtml((anime as { description?: string }).description ?? ""),
    200
  ) || "A standout pick from this season — dive in and start watching.";

  const titleGradientStyle = anime.color
    ? {
        backgroundImage: `linear-gradient(100deg, ${anime.color} 0%, #ffffff 70%)`,
        WebkitBackgroundClip: "text" as const,
        WebkitTextFillColor: "transparent" as const,
        backgroundClip: "text" as const,
      }
    : undefined;

  const FormatIcon = anime.format === "MOVIE" ? Film : Tv;

  return (
    <section
      className="relative h-[52vh] min-h-[300px] w-full overflow-hidden rounded-2xl bg-[#0d0d0d] sm:h-[62vh] sm:min-h-[460px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background banner */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`bg-${anime.id}`}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0"
        >
          {(anime.bannerImage || anime.coverImage) && (
            <Image
              src={anime.bannerImage || anime.coverImage}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-top"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dark vignette overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/90" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />

      {/* ── TOP BAR ──────────────────────────────────────── */}
      <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between">
        {/* Airing badge */}
        <div>
          {anime.status === "RELEASING" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              {anime.currentEpisode ? `EP ${anime.currentEpisode} ` : ""}Airing Now
            </span>
          )}
        </div>

        {/* Slide counter + arrows */}
        {count > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => go(-1)}
              aria-label="Previous"
              className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-foreground backdrop-blur-sm transition hover:bg-card"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[52px] text-center text-xs font-semibold text-foreground/80">
              {index + 1} / {count}
            </span>
            <button
              onClick={() => go(1)}
              aria-label="Next"
              className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-foreground backdrop-blur-sm transition hover:bg-card"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── CENTER CONTENT ───────────────────────────────── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={anime.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center gap-3"
          >
            {/* Metadata pills */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {anime.format && (
                <span className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/40 px-2.5 py-1 text-xs font-medium text-foreground/80 backdrop-blur-sm">
                  <FormatIcon className="size-3" />
                  {formatFormat(anime.format)}
                </span>
              )}
              {anime.episodes && (
                <span className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/40 px-2.5 py-1 text-xs font-medium text-foreground/80 backdrop-blur-sm">
                  <Hash className="size-3" />
                  {anime.episodes}
                </span>
              )}
              {anime.averageScore ? (
                <span className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/40 px-2.5 py-1 text-xs font-medium text-foreground/80 backdrop-blur-sm">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  {formatScore(anime.averageScore)}
                </span>
              ) : null}
              {(anime as { duration?: number }).duration ? (
                <span className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/40 px-2.5 py-1 text-xs font-medium text-foreground/80 backdrop-blur-sm">
                  <Clock className="size-3" />
                  {(anime as { duration?: number }).duration} mins
                </span>
              ) : null}
            </div>

            {/* Title */}
            <h1
              className="text-center text-2xl font-black leading-tight drop-shadow-2xl sm:text-4xl md:text-5xl lg:text-6xl"
              style={titleGradientStyle}
            >
              {title}
            </h1>

            {/* Genres + Studio */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {anime.genres.length > 0 && (
                <span className="text-sm text-foreground/60">
                  {anime.genres.slice(0, 3).join(" · ")}
                </span>
              )}
              {(anime as { studios?: string[] }).studios?.[0] && (
                <span className="rounded-md border border-border/50 bg-background/40 px-2.5 py-0.5 text-xs text-foreground/70 backdrop-blur-sm">
                  {(anime as { studios?: string[] }).studios![0]}
                </span>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── BOTTOM BAR ───────────────────────────────────── */}
      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
        {/* Description */}
        <AnimatePresence mode="wait">
          <motion.p
            key={anime.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="hidden max-w-sm text-xs leading-relaxed text-foreground/55 sm:line-clamp-3"
          >
            {description}
          </motion.p>
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/anime/${anime.slug}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5 backdrop-blur-sm"
            )}
          >
            <Info className="size-3.5" />
            Details
          </Link>
          <Link
            href={`/watch/${anime.slug}?ep=1`}
            className={cn(
              buttonVariants({ size: "sm" }),
              "gap-1.5 shadow-lg shadow-primary/30"
            )}
          >
            <Play className="size-3.5 fill-current" />
            Watch Now
          </Link>
        </div>
      </div>

      {/* Progress dots */}
      {count > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="group relative"
              >
                <span
                  className={cn(
                    "block h-1 rounded-full transition-all duration-300",
                    i === index
                      ? "w-6 bg-primary"
                      : "w-1.5 bg-white/25 group-hover:bg-white/50"
                  )}
                />
                {i === index && (
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-primary/40"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
