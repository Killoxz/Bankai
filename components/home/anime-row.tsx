"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePreferredTitle, type AnimeMedia } from "@/lib/anilist";
import { ScrollRow } from "./scroll-row";
import { useCardAnimation } from "@/hooks/use-card-animation";
import { useSettingsStore } from "@/store/settings-store";

const CARD_WIDTHS = { small: "w-[120px]", medium: "w-[148px]", large: "w-[180px]" } as const;
const CARD_SIZES  = { small: "120px",     medium: "148px",     large: "180px"     } as const;

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
  const cardLayout = useSettingsStore((s) => s.cardLayout);

  if (items.length === 0) return null;

  // ── Row List layout: vertical compact list ────────────────────────────────
  if (cardLayout === "row") {
    return (
      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">{title}</h2>
        <div className="divide-y divide-gray-100 dark:divide-white/[0.06] rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
          {items.map((anime, i) => (
            <RowItem key={anime.id} anime={anime} showBadge={showBadge} index={i} />
          ))}
        </div>
      </section>
    );
  }

  // ── Anichart layout: grid wraps into multiple rows ────────────────────────
  if (cardLayout === "anichart") {
    return (
      <section>
        <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {items.map((anime, i) => (
            <AnimeCard
              key={anime.id}
              anime={anime}
              showProgress={showProgress}
              showBadge={showBadge}
              index={i}
            />
          ))}
        </div>
      </section>
    );
  }

  // ── Default layout: horizontal scroll row ────────────────────────────────
  return (
    <section>
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
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
  const cardSize = useSettingsStore((s) => s.cardSize);
  const { wrapRef, cardRef, glareRef, onMove, onLeave } = useCardAnimation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
    >
      <Link href={`/anime/${anime.id}`} className={`group block flex-shrink-0 ${CARD_WIDTHS[cardSize]}`}>
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
                sizes={CARD_SIZES[cardSize]}
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

            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30">
              <div className="scale-90 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                <div className="grid size-10 place-items-center rounded-full bg-primary shadow-lg">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 text-black">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>

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

        <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-card-foreground group-hover:text-foreground">
          {title}
        </p>
        {anime.seasonYear && (
          <p className="text-[11px] text-muted-foreground">{anime.seasonYear}</p>
        )}
      </Link>
    </motion.div>
  );
}

function RowItem({
  anime,
  showBadge,
  index,
}: {
  anime: AnimeMedia;
  showBadge?: boolean;
  index: number;
}) {
  const title = usePreferredTitle(anime);
  const isNew = anime.status === "RELEASING";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link
        href={`/anime/${anime.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04] group"
      >
        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-white/5">
          {anime.coverImage.large && (
            <Image src={anime.coverImage.large} alt={title} fill sizes="40px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-medium text-card-foreground group-hover:text-foreground">
            {title}
          </p>
          <p className="text-xs text-muted-foreground">
            {[anime.seasonYear, anime.format].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(showBadge || isNew) && (
            <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">New</span>
          )}
          {anime.averageScore && (
            <span className="text-xs text-muted-foreground">★ {(anime.averageScore / 10).toFixed(1)}</span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
