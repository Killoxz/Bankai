"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import type { RelationEntry } from "@/lib/anilist";

const SEASON_TYPES = new Set(["PREQUEL", "SEQUEL", "SIDE_STORY", "SPIN_OFF", "PARENT", "ALTERNATIVE"]);

interface SeasonsPanelProps {
  relations: RelationEntry[];
  currentAnimeId: number;
}

export function SeasonsPanel({ relations, currentAnimeId }: SeasonsPanelProps) {
  const seasons = relations.filter(
    (r) => r.node.type === "ANIME" && SEASON_TYPES.has(r.relationType)
  );

  if (seasons.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-[#111]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
        <Layers className="size-4 text-white/50" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Seasons</h3>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-3 p-3">
        {/* Current anime card (always first) */}
        <div
          className="relative aspect-video overflow-hidden rounded-lg border-2 border-primary ring-1 ring-primary/40"
        >
          {/* No cover for current — rely on placeholder */}
          <div className="flex size-full items-center justify-center bg-primary/10">
            <span className="text-[11px] font-bold text-primary">Current</span>
          </div>
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2">
            <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
              Watching Now
            </span>
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
                "group relative aspect-video overflow-hidden rounded-lg border-2 transition-all",
                isActive
                  ? "border-primary ring-1 ring-primary/40"
                  : "border-transparent hover:border-white/25",
              ].join(" ")}
            >
              {/* Cover */}
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

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

              {/* Type badge */}
              <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/80 backdrop-blur-sm">
                {label}
              </span>

              {/* Title */}
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
