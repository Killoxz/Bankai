"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { usePreferredTitle, type AnimeMedia } from "@/lib/anilist";
import { useCardAnimation } from "@/hooks/use-card-animation";

export function AnimeCard({
  anime,
  statusLabel,
  index = 0,
}: {
  anime: AnimeMedia;
  statusLabel?: string;
  index?: number;
}) {
  const title = usePreferredTitle(anime);
  const { wrapRef, cardRef, glareRef, onMove, onLeave } = useCardAnimation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.035, 0.5) }}
    >
      <Link href={`/anime/${anime.id}`} className="group block">
        <div
          ref={wrapRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          style={{ perspective: "700px" }}
        >
          <div
            ref={cardRef}
            className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-200 dark:bg-white/5"
            style={{
              transformStyle: "preserve-3d",
              transition:     "transform 0.12s ease-out, box-shadow 0.12s ease-out",
              willChange:     "transform",
            }}
          >
            {anime.coverImage.large && (
              <Image
                src={anime.coverImage.large}
                alt={title}
                fill
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
                className="object-cover"
              />
            )}

            {(anime.averageScore || statusLabel) && (
              <div className="absolute left-2 top-2 flex items-center gap-1.5">
                {anime.averageScore && (
                  <span className="flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                    ★ {(anime.averageScore / 10).toFixed(1)}
                  </span>
                )}
                {statusLabel && (
                  <span className="rounded-md bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-black backdrop-blur-sm">
                    {statusLabel}
                  </span>
                )}
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/35">
              <div className="scale-75 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                <div className="grid size-12 place-items-center rounded-full bg-primary shadow-xl">
                  <Play className="size-5 fill-black text-black" />
                </div>
              </div>
            </div>

            <div
              ref={glareRef}
              className="pointer-events-none absolute inset-0 z-10 rounded-xl"
              style={{ opacity: 0, transition: "opacity 0.25s ease-out" }}
            />

            <div className="absolute inset-0 rounded-xl ring-2 ring-inset ring-transparent transition-all duration-200 group-hover:ring-white/20" />
          </div>
        </div>

        <p className="mt-2 line-clamp-2 text-sm font-medium text-card-foreground group-hover:text-foreground">
          {title}
        </p>
        <p className="text-xs text-muted-foreground">
          {[anime.seasonYear, anime.genres[0]].filter(Boolean).join(", ")}
        </p>
      </Link>
    </motion.div>
  );
}
