"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { AnimeCard, AnimeCardSkeleton } from "./anime-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, preferredTitle } from "@/lib/utils";
import { usePlayerStore } from "@/store/player-store";
import type { AnimeCard as TAnimeCard } from "@/types/anime";

export function AnimeRow({
  title,
  icon,
  items,
  loading,
  href,
}: {
  title: string;
  icon?: React.ReactNode;
  items?: TAnimeCard[];
  loading?: boolean;
  href?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const cardLayout = usePlayerStore((s) => s.cardLayout);
  const cardSize = usePlayerStore((s) => s.cardSize);
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);

  const scrollBy = (dir: 1 | -1) => {
    scroller.current?.scrollBy({ left: dir * 600, behavior: "smooth" });
  };

  const cardW = cardSize === "large"
    ? "w-[52vw] shrink-0 snap-start sm:w-52 md:w-56"
    : "w-[44vw] shrink-0 snap-start sm:w-44 md:w-48";

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
          {icon}
          {title}
        </h2>
        <div className="flex items-center gap-1">
          {href && (
            <Link href={href} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}>
              View all <ArrowRight className="size-4" />
            </Link>
          )}
          <div className="hidden gap-1 sm:flex">
            <Button variant="glass" size="iconSm" onClick={() => scrollBy(-1)} aria-label="Scroll left">
              <ChevronLeft />
            </Button>
            <Button variant="glass" size="iconSm" onClick={() => scrollBy(1)} aria-label="Scroll right">
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      {cardLayout === "rowlist" ? (
        <div className="space-y-2">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="skeleton h-20 w-14 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="skeleton h-3.5 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))
            : items?.map((anime) => (
                <a
                  key={anime.id}
                  href={`/anime/${anime.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-2 transition hover:bg-accent"
                >
                  {anime.coverImage && (
                    <img src={anime.coverImage} alt="" className="h-16 w-11 shrink-0 rounded-md object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{preferredTitle(anime.title, titleLanguage)}</p>
                    <p className="text-xs text-muted-foreground">
                      {[anime.seasonYear, anime.genres.slice(0, 2).join(", ")].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {anime.averageScore && (
                    <span className="shrink-0 text-xs font-semibold text-primary">★ {(anime.averageScore / 10).toFixed(1)}</span>
                  )}
                </a>
              ))}
        </div>
      ) : (
        <div
          ref={scroller}
          className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1"
          style={{
            maskImage: "linear-gradient(to right, black 88%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, black 88%, transparent 100%)",
          }}
        >
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={cardW}>
                  <AnimeCardSkeleton />
                </div>
              ))
            : items?.map((anime, i) => (
                <div key={anime.id} className={cardW}>
                  <AnimeCard anime={anime} index={i} />
                </div>
              ))}
        </div>
      )}
    </section>
  );
}
