"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePreferredTitle, type AnimeMedia } from "@/lib/anilist";

export function AnimeRow({
  title,
  items,
  showProgress = false,
  showBadge = false,
}: {
  title: string;
  items: AnimeMedia[];
  showProgress?: boolean;
  showBadge?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update, items]);

  const scrollByDir = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  const arrowBase =
    "absolute top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/70 p-2 text-white opacity-0 shadow-lg backdrop-blur-sm transition-opacity hover:bg-black group-hover/row:opacity-100 sm:grid place-items-center";

  return (
    <section className="group/row relative">
      <h2 className="mb-4 text-base font-semibold text-white">{title}</h2>

      <div
        ref={scroller}
        onScroll={update}
        className="no-scrollbar flex gap-3 overflow-x-auto pb-2"
      >
        {items.map((anime) => (
          <AnimeCard
            key={anime.id}
            anime={anime}
            showProgress={showProgress}
            showBadge={showBadge}
          />
        ))}
      </div>

      {canLeft && (
        <button onClick={() => scrollByDir(-1)} aria-label="Scroll left" className={`${arrowBase} -left-4`}>
          <ChevronLeft className="size-5" />
        </button>
      )}
      {canRight && (
        <button onClick={() => scrollByDir(1)} aria-label="Scroll right" className={`${arrowBase} -right-4`}>
          <ChevronRight className="size-5" />
        </button>
      )}
    </section>
  );
}

function AnimeCard({
  anime,
  showProgress,
  showBadge,
}: {
  anime: AnimeMedia;
  showProgress?: boolean;
  showBadge?: boolean;
}) {
  const title = usePreferredTitle(anime);
  const isNew = anime.status === "RELEASING";
  // Deterministic placeholder until real watch history exists
  const progress = showProgress ? (anime.id % 65) + 15 : 0;

  return (
    <Link href={`/anime/${anime.id}`} className="group w-[148px] flex-shrink-0">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white/5">
        {anime.coverImage.large && (
          <Image
            src={anime.coverImage.large}
            alt={title}
            fill
            sizes="148px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {(showBadge || isNew) && (
          <span className="absolute left-2 top-2 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            New Season
          </span>
        )}

        <div className="absolute inset-0 rounded-xl ring-2 ring-inset ring-white/0 transition-all duration-200 group-hover:ring-white/30" />

        {showProgress && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
            <div className="h-full bg-red-500" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-white/90">
        {title}
      </p>
    </Link>
  );
}
