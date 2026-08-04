"use client";

import Link from "next/link";
import { Tv2 } from "lucide-react";
import type { RelationEntry } from "@/lib/anilist";
import { cn } from "@/lib/utils";

const SEASON_TYPES = new Set(["PREQUEL", "SEQUEL", "SIDE_STORY", "SPIN_OFF", "PARENT", "ALTERNATIVE"]);

function extractSeasonLabel(title: string): string | null {
  const sp = title.match(/season\s*(\d+)[^]*?part\s*(\d+)/i);
  if (sp) return `Season ${sp[1]} Part ${sp[2]}`;
  const s = title.match(/season\s*(\d+)/i);
  if (s) return `Season ${s[1]}`;
  const p = title.match(/part\s*(\d+)/i);
  if (p) return `Part ${p[1]}`;
  return null;
}

function shortLabel(title: string, relationType: string): string {
  const extracted = extractSeasonLabel(title);
  if (extracted) return extracted;
  switch (relationType) {
    case "SIDE_STORY":   return "Specials";
    case "SPIN_OFF":     return "Spin-off";
    case "ALTERNATIVE":  return "Alternative";
    case "PARENT":       return "Main Series";
    case "PREQUEL":      return "Prequel";
    default:             return title.length > 22 ? title.slice(0, 20) + "…" : title;
  }
}

function currentLabel(title: string): string {
  const extracted = extractSeasonLabel(title);
  if (extracted) return extracted;
  // Use the actual title — never fabricate a season number
  return title.length > 22 ? title.slice(0, 20) + "…" : title;
}

interface SeasonsPanelProps {
  relations:      RelationEntry[];
  currentAnimeId: number;
  currentCover?:  string;
  currentTitle?:  string;
}

export function SeasonsPanel({
  relations,
  currentAnimeId,
  currentCover,
  currentTitle,
}: SeasonsPanelProps) {
  const seasons = relations.filter(
    (r) => r.node.type === "ANIME" && SEASON_TYPES.has(r.relationType),
  );

  if (seasons.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.05] bg-[#111]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-3">
        <Tv2 className="size-4 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-white">Seasons</h3>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2 p-2.5">
        {/* Current anime — always first */}
        <div className="group relative aspect-video overflow-hidden rounded-lg ring-2 ring-primary shadow-[0_0_12px_rgba(var(--primary-rgb,139,92,246),0.4)]">
          {currentCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentCover} alt="" className="size-full object-cover" />
          ) : (
            <div className="size-full bg-primary/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <p className="absolute inset-x-0 bottom-0 px-2.5 pb-2 text-[13px] font-semibold leading-tight text-primary drop-shadow-md">
            {currentTitle ? currentLabel(currentTitle) : "Season 1"}
          </p>
        </div>

        {seasons.map(({ node, relationType }) => {
          const isActive = node.id === currentAnimeId;
          const label    = shortLabel(node.title.english ?? node.title.romaji, relationType);

          return (
            <Link
              key={node.id}
              href={`/watch/${node.id}`}
              className={cn(
                "group relative aspect-video overflow-hidden rounded-lg transition-all duration-200",
                isActive
                  ? "ring-2 ring-primary shadow-[0_0_12px_rgba(var(--primary-rgb,139,92,246),0.4)]"
                  : "ring-1 ring-white/0 hover:ring-white/20",
              )}
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <p className={cn(
                "absolute inset-x-0 bottom-0 px-2.5 pb-2 text-[13px] font-semibold leading-tight drop-shadow-md",
                isActive ? "text-primary" : "text-white",
              )}>
                {label}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
