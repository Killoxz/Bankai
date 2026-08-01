"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import type { RelationEntry } from "@/lib/anilist";

const SEASON_TYPES = new Set(["PREQUEL", "SEQUEL", "SIDE_STORY", "SPIN_OFF", "PARENT", "ALTERNATIVE"]);

interface SeasonsPanelProps {
  relations: RelationEntry[];
  currentAnimeId: number;
  currentCover?: string;
  currentTitle?: string;
}

export function SeasonsPanel({
  relations,
  currentAnimeId,
  currentCover,
  currentTitle,
}: SeasonsPanelProps) {
  const seasons = relations.filter(
    (r) => r.node.type === "ANIME" && SEASON_TYPES.has(r.relationType)
  );

  if (seasons.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.05] bg-[#111]">
      <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-3">
        <Layers className="size-4 text-white/50" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Seasons</h3>
      </div>

      <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3">
        {/* Current anime — always first */}
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg ring-2 ring-primary/60">
          {currentCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentCover}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full bg-primary/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          <span className="absolute left-1.5 top-1.5 rounded-md bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black">
            Watching
          </span>
          <div className="absolute inset-x-0 bottom-0 p-2">
            <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
              {currentTitle ?? "Current"}
            </p>
          </div>
        </div>

        {seasons.map(({ node, relationType }) => {
          const isActive = node.id === currentAnimeId;
          const label = relationType
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

          return (
            <Link
              key={node.id}
              href={`/watch/${node.id}`}
              className={[
                "group relative aspect-[2/3] overflow-hidden rounded-lg ring-1 transition-all duration-200",
                isActive
                  ? "ring-primary/60"
                  : "ring-white/0 hover:ring-white/20",
              ].join(" ")}
            >
              {node.coverImage.large ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={node.coverImage.large}
                  alt=""
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="size-full bg-white/5" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

              <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/80 backdrop-blur-sm">
                {label}
              </span>

              <div className="absolute inset-x-0 bottom-0 p-2">
                <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
                  {node.title.english ?? node.title.romaji}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
