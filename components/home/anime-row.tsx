"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePreferredTitle, type AnimeMedia } from "@/lib/anilist";
import { ScrollRow } from "./scroll-row";

export function AnimeRow({
  title,
  items,
  showProgress = false,
  showBadge    = false,
}: {
  title: string;
  items: AnimeMedia[];
  showProgress?: boolean;
  showBadge?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
      <ScrollRow className="gap-3 pb-2">
        {items.map((anime, i) => (
          <AnimeCard
            key={anime.id}
            anime={anime}
            showProgress={showProgress}
            showBadge={showBadge}
            index={i}
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
  index,
}: {
  anime: AnimeMedia;
  showProgress?: boolean;
  showBadge?: boolean;
  index: number;
}) {
  const title  = usePreferredTitle(anime);
  const isNew  = anime.status === "RELEASING";
  const progress = showProgress ? (anime.id % 65) + 15 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
    >
      <Link href={`/anime/${anime.id}`} className="group block w-[148px] flex-shrink-0">
        <motion.div
          whileHover={{ scale: 1.04 }}
          transition={{ duration: 0.2 }}
          className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-200 dark:bg-white/5"
        >
          {anime.coverImage.large && (
            <Image
              src={anime.coverImage.large}
              alt={title}
              fill
              sizes="148px"
              className="object-cover"
            />
          )}

          {(showBadge || isNew) && (
            <span className="absolute left-2 top-2 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              New
            </span>
          )}

          {anime.averageScore && (
            <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              ★ {(anime.averageScore / 10).toFixed(1)}
            </span>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30">
            <div className="scale-90 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
              <div className="grid size-10 place-items-center rounded-full bg-primary shadow-lg">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 text-black">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 rounded-xl ring-2 ring-inset ring-transparent transition-all duration-200 group-hover:ring-black/20 dark:group-hover:ring-white/25" />

          {showProgress && (
            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
              <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          )}
        </motion.div>

        <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-gray-800 dark:text-white/90">{title}</p>
        {anime.seasonYear && (
          <p className="text-[11px] text-gray-500 dark:text-white/40">{anime.seasonYear}</p>
        )}
      </Link>
    </motion.div>
  );
}
