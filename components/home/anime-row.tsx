"use client";

import Image from "next/image";
import Link from "next/link";
import { usePreferredTitle, type AnimeMedia } from "@/lib/anilist";
import { ScrollRow } from "./scroll-row";

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
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold text-white">{title}</h2>

      <ScrollRow className="gap-3 pb-2">
        {items.map((anime) => (
          <AnimeCard
            key={anime.id}
            anime={anime}
            showProgress={showProgress}
            showBadge={showBadge}
          />
        ))}
      </ScrollRow>
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
