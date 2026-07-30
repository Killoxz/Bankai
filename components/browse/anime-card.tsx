"use client";

import Image from "next/image";
import Link from "next/link";
import { usePreferredTitle, type AnimeMedia } from "@/lib/anilist";

export function AnimeCard({
  anime,
  statusLabel,
}: {
  anime: AnimeMedia;
  /** Shown next to the rating badge while a Status filter is active on /browse; disappears when the filter is cleared. */
  statusLabel?: string;
}) {
  const title = usePreferredTitle(anime);

  return (
    <Link href={`/anime/${anime.id}`} className="group">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white/5">
        {anime.coverImage.large && (
          <Image
            src={anime.coverImage.large}
            alt={title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        {(anime.averageScore || statusLabel) && (
          <div className="absolute left-2 top-2 flex items-center gap-1.5">
            {anime.averageScore && (
              <span className="flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white">
                ★ {(anime.averageScore / 10).toFixed(1)}
              </span>
            )}
            {statusLabel && (
              <span className="rounded-md bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-black">
                {statusLabel}
              </span>
            )}
          </div>
        )}
        <div className="absolute inset-0 rounded-xl ring-2 ring-inset ring-white/0 transition-all duration-200 group-hover:ring-white/30" />
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium text-white/90">{title}</p>
      <p className="text-xs text-white/40">
        {[anime.seasonYear, anime.genres[0]].filter(Boolean).join(", ")}
      </p>
    </Link>
  );
}
