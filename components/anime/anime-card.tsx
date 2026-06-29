"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, Star, Clock } from "lucide-react";
import { cn, formatScore, formatFormat, preferredTitle } from "@/lib/utils";
import { usePlayerStore } from "@/store/player-store";
import type { AnimeCard as TAnimeCard } from "@/types/anime";

export function AnimeCard({
  anime,
  className,
  index = 0,
  progress,
}: {
  anime: TAnimeCard;
  className?: string;
  index?: number;
  progress?: { current: number; duration: number; episode: number };
}) {
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);
  const title = preferredTitle(anime.title, titleLanguage);
  const pct = progress && progress.duration > 0
    ? Math.min(100, (progress.current / progress.duration) * 100)
    : 0;

  return (
    <div
      className={cn(
        "group relative animate-in fade-in slide-in-from-bottom-3 fill-mode-both",
        className
      )}
      style={{ animationDelay: `${Math.min(index * 28, 280)}ms`, animationDuration: "320ms" }}
    >
      <Link href={`/anime/${anime.slug}`} className="block">
        {/* Poster */}
        <div className="relative aspect-[2/3] rounded-xl bg-muted">
          {/* Inner div clips the image scale — nothing else goes inside here */}
          <div className="absolute inset-0 overflow-hidden rounded-xl">
            {anime.coverImage && (
              <Image
                src={anime.coverImage}
                alt={title}
                fill
                priority={index === 0}
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
                className="object-cover transition-transform duration-500 will-change-transform group-hover:scale-110"
              />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-80" />

            {/* Top badges — solid dark style */}
            <div className="absolute inset-x-2 top-2 flex items-start justify-between">
              {anime.averageScore ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
                  <Star className="size-2.5 fill-amber-400 text-amber-400" />
                  {formatScore(anime.averageScore)}
                </span>
              ) : (
                <span />
              )}
              {anime.format && (
                <span className="inline-flex items-center rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
                  {formatFormat(anime.format)}
                </span>
              )}
            </div>

            {/* Center play button on hover — solid, no blur */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40">
                <Play className="size-5 translate-x-0.5 fill-current" />
              </span>
            </div>

            {/* Episode badge (bottom left) */}
            {anime.currentEpisode ? (
              <div className="absolute bottom-2 left-2">
                <span className="inline-flex items-center rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
                  EP {anime.currentEpisode}
                </span>
              </div>
            ) : null}

            {/* Airing dot */}
            {anime.status === "RELEASING" && !anime.currentEpisode && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-300 font-medium">Airing</span>
              </div>
            )}
          </div>

          {/* Progress bar — outside overflow-hidden so it stays pinned and visible */}
          {pct > 0 && (
            <div className="absolute inset-x-0 bottom-0 z-10 rounded-b-xl overflow-hidden">
              <div className="h-1 w-full bg-black/50">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Text below poster */}
        <div className="mt-2 space-y-0.5">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
            {title}
          </h3>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {[anime.seasonYear, anime.genres.slice(0, 2).join(", ")]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {progress && (
            <p className="flex items-center gap-1 text-[11px] text-primary/80">
              <Clock className="size-2.5" />
              EP {progress.episode} · {Math.round(pct)}%
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}

export function AnimeCardSkeleton() {
  return (
    <div className="space-y-2">
      <div className="skeleton aspect-[2/3] w-full rounded-xl" />
      <div className="skeleton h-3.5 w-4/5 rounded" />
      <div className="skeleton h-3 w-1/2 rounded" />
    </div>
  );
}
