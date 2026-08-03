"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRef, useCallback } from "react";
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
      {/* -my-4 pulls the vertical padding back so section spacing stays the same;
          py-4 inside gives cards room to tilt/scale without overflow clipping */}
      <div className="-mx-4 -my-4">
        <ScrollRow className="gap-3 px-4 py-4">
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
      </div>
    </section>
  );
}

const TILT_X = 18;
const TILT_Y = 22;

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
  const title    = usePreferredTitle(anime);
  const isNew    = anime.status === "RELEASING";
  const progress = showProgress ? (anime.id % 65) + 15 : 0;

  const wrapRef  = useRef<HTMLDivElement>(null);
  const cardRef  = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const wrap  = wrapRef.current;
    const card  = cardRef.current;
    const glare = glareRef.current;
    if (!wrap || !card) return;

    const { left, top, width, height } = wrap.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top)  / height;

    const rY =  (x - 0.5) * TILT_Y * 2;
    const rX = -(y - 0.5) * TILT_X * 2;

    card.style.transform = `rotateX(${rX}deg) rotateY(${rY}deg) scale3d(1.07,1.07,1.07)`;
    card.style.boxShadow = `${-rY * 1.2}px ${rX * 1.2}px 40px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.4)`;

    if (glare) {
      glare.style.opacity    = "1";
      glare.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.22) 0%, transparent 62%)`;
    }
  }, []);

  const onLeave = useCallback(() => {
    const card  = cardRef.current;
    const glare = glareRef.current;
    if (!card) return;
    card.style.transform = "rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    card.style.boxShadow = "";
    if (glare) glare.style.opacity = "0";
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
    >
      <Link href={`/anime/${anime.id}`} className="group block w-[148px] flex-shrink-0">
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

            {/* Glare layer */}
            <div
              ref={glareRef}
              className="pointer-events-none absolute inset-0 z-10 rounded-xl"
              style={{ opacity: 0, transition: "opacity 0.25s ease-out" }}
            />

            <div className="absolute inset-0 rounded-xl ring-2 ring-inset ring-transparent transition-all duration-200 group-hover:ring-white/20" />

            {showProgress && (
              <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
                <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        </div>

        <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-gray-800 dark:text-white/90">{title}</p>
        {anime.seasonYear && (
          <p className="text-[11px] text-gray-500 dark:text-white/40">{anime.seasonYear}</p>
        )}
      </Link>
    </motion.div>
  );
}
