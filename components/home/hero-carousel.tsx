"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePreferredTitle, type AnimeMedia } from "@/lib/anilist";
import { stripHtml } from "@/lib/utils";

const INTERVAL_MS = 7000;
const HERO_HEIGHT = { height: "min(72vh, 720px)", minHeight: 520 };

export function HeroCarousel({ items }: { items: AnimeMedia[] }) {
  const [index, setIndex] = useState(0);
  const count = items.length;

  useEffect(() => {
    if (count < 2) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [index, count]);

  if (count === 0) {
    return <div style={HERO_HEIGHT} className="w-full bg-zinc-900" />;
  }

  return (
    <section className="relative w-full overflow-hidden" style={HERO_HEIGHT}>
      <AnimatePresence mode="wait" initial={false}>
        <HeroSlide
          key={items[index].id}
          anime={items[index]}
          priority={index === 0}
        />
      </AnimatePresence>

      {/* Slide indicators */}
      {count > 1 && (
        <div className="absolute bottom-8 left-8 z-20 flex items-center gap-2 sm:left-12">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={[
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-6 bg-primary" : "w-1.5 bg-white/30 hover:bg-white/60",
              ].join(" ")}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function HeroSlide({ anime, priority }: { anime: AnimeMedia; priority: boolean }) {
  const title = usePreferredTitle(anime);
  const desc  = anime.description ? stripHtml(anime.description) : "";

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      <Image
        src={anime.bannerImage!}
        alt={title}
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover object-top"
      />

      {/* Gradients */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, #141414 0%, rgba(20,20,20,.88) 28%, rgba(20,20,20,.45) 58%, transparent 85%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-48"
        style={{ background: "linear-gradient(to top, #141414 0%, transparent 100%)" }}
      />

      {/* Content */}
      <div className="absolute bottom-20 left-0 right-0 px-8 sm:px-12">
        <div className="max-w-xl">
          {/* Genre badges */}
          {anime.genres.length > 0 && (
            <motion.div
              className="mb-3 flex flex-wrap gap-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {anime.genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/80 backdrop-blur-sm"
                >
                  {g}
                </span>
              ))}
            </motion.div>
          )}

          <motion.h1
            className="text-4xl font-bold leading-tight text-white sm:text-5xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {title}
          </motion.h1>

          <motion.p
            className="mt-4 text-sm leading-relaxed text-white/60 line-clamp-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
          >
            {desc.slice(0, 220)}{desc.length > 220 ? "…" : ""}
          </motion.p>

          {/* Metadata row */}
          <motion.div
            className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.28 }}
          >
            {anime.averageScore && (
              <span className="flex items-center gap-1">
                <span className="text-primary">★</span>
                {(anime.averageScore / 10).toFixed(1)}
              </span>
            )}
            {anime.episodes && <span>{anime.episodes} episodes</span>}
            {anime.seasonYear && <span>{anime.seasonYear}</span>}
            {anime.status === "RELEASING" && (
              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                Airing
              </span>
            )}
          </motion.div>

          <motion.div
            className="mt-6 flex items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.32 }}
          >
            <Link
              href={`/watch/${anime.id}`}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 active:scale-95"
            >
              <Play className="size-4 fill-black" />
              Watch Now
            </Link>
            <Link
              href={`/anime/${anime.id}`}
              className="flex items-center gap-2 rounded-full border border-white/25 bg-white/8 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:border-white/50 hover:bg-white/15"
            >
              <Info className="size-4" />
              More Info
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
