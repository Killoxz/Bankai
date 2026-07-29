"use client";

import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { usePreferredTitle, type AnimeMedia } from "@/lib/anilist";
import { stripHtml } from "@/lib/utils";

const INTERVAL_MS = 7000;
const HERO_HEIGHT = { height: "min(72vh, 720px)", minHeight: 520 };

export function HeroCarousel({ items }: { items: AnimeMedia[] }) {
  const [index, setIndex] = useState(0);
  const count = items.length;

  // Auto-advance; re-arms after every slide change (manual or automatic)
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
      {items.map((anime, i) => (
        <HeroSlide key={anime.id} anime={anime} active={i === index} priority={i === 0} />
      ))}

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

function HeroSlide({
  anime,
  active,
  priority,
}: {
  anime: AnimeMedia;
  active: boolean;
  priority: boolean;
}) {
  const title = usePreferredTitle(anime);
  const desc = anime.description ? stripHtml(anime.description) : "";

  return (
    <div
      aria-hidden={!active}
      className={[
        "absolute inset-0 transition-opacity duration-700",
        active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0",
      ].join(" ")}
    >
      <Image
        src={anime.bannerImage!}
        alt={title}
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover object-top"
      />

      {/* Left gradient — keeps text readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, #141414 0%, rgba(20,20,20,.85) 30%, rgba(20,20,20,.4) 60%, transparent 85%)",
        }}
      />
      {/* Bottom fade into page */}
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{ background: "linear-gradient(to top, #141414 0%, transparent 100%)" }}
      />

      <div className="absolute bottom-20 left-0 right-0 px-8 sm:px-12">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60 line-clamp-3">
            {desc.slice(0, 220)}
            {desc.length > 220 ? "…" : ""}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Link
              href={`/watch/${anime.id}`}
              className="flex items-center gap-2 rounded-full border border-white bg-white/10 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <Play className="size-4 fill-white" />
              Play
            </Link>
            <Link
              href={`/anime/${anime.id}`}
              className="rounded-full border border-white/25 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/50"
            >
              More Info
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
