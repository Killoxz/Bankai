"use client";

import Image from "next/image";
import { useState } from "react";
import { ReviewsSection } from "./reviews-section";
import { DetailEpisodeList } from "./detail-episode-list";
import { AnimeCard } from "@/components/browse/anime-card";
import { ScrollRow } from "@/components/home/scroll-row";
import {
  type AnimeDetail,
  type AnimeMedia,
  type CharacterEntry,
  type StaffEntry,
  type RelationEntry,
} from "@/lib/anilist";

type TabKey = "overview" | "relations" | "characters" | "staff" | "reviews";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "relations", label: "Relations" },
  { key: "characters", label: "Characters" },
  { key: "staff", label: "Staff" },
  { key: "reviews", label: "Reviews" },
];

function formatDate(d: { year: number | null; month: number | null; day: number | null }) {
  if (!d.year) return null;
  const date = new Date(d.year, (d.month ?? 1) - 1, d.day ?? 1);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: d.day ? "numeric" : undefined,
    year: "numeric",
  });
}

function formatStatus(s: string | null) {
  if (!s) return null;
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function DetailTabs({ detail, animeId }: { detail: AnimeDetail; animeId: number }) {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div>
      <div className="flex flex-wrap gap-6 border-b border-white/10">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              "border-b-2 pb-3 text-sm font-medium transition-colors",
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-gray-400 dark:text-white/45 hover:text-gray-700 dark:hover:text-white/75",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="py-8">
        {tab === "overview" && <OverviewTab detail={detail} animeId={animeId} />}
        {tab === "relations" && <RelationsTab edges={detail.relations.edges} />}
        {tab === "characters" && <PeopleGrid title="Anime Characters" edges={detail.characters.edges} />}
        {tab === "staff" && <PeopleGrid title="Staff" edges={detail.staff.edges} />}
        {tab === "reviews" && <ReviewsSection animeId={animeId} />}
      </div>
    </div>
  );
}

function OverviewTab({ detail, animeId }: { detail: AnimeDetail; animeId: number }) {
  const aired = formatDate(detail.startDate);
  const airedEnd = formatDate(detail.endDate);
  const details: [string, string | null][] = [
    ["Type", detail.format ? formatStatus(detail.format) : null],
    ["Episodes", detail.episodes ? String(detail.episodes) : null],
    ["Genres", detail.genres.length ? detail.genres.join(", ") : null],
    ["Aired", aired ? (airedEnd && airedEnd !== aired ? `${aired} to ${airedEnd}` : aired) : null],
    ["Status", formatStatus(detail.status)],
    ["Season", detail.season && detail.seasonYear ? `${formatStatus(detail.season)} ${detail.seasonYear}` : null],
    ["Studios", detail.studios.nodes.map((s) => s.name).join(", ") || null],
    ["Source", detail.source ? formatStatus(detail.source) : null],
    ["Duration", detail.duration ? `${detail.duration} min.` : null],
  ];

  const seenRecIds = new Set<number>();
  const recs = detail.recommendations.nodes
    .map((n) => n.mediaRecommendation)
    .filter((m): m is AnimeMedia => !!m)
    .filter((m) => (seenRecIds.has(m.id) ? false : (seenRecIds.add(m.id), true)))
    .slice(0, 12);

  return (
    <div>
      <div className="grid gap-10 md:grid-cols-[220px_1fr]">
        <div>
          <h2 className="mb-4 text-xl font-bold text-foreground">Details</h2>
          <dl className="space-y-3 text-sm">
            {details
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label} className="grid grid-cols-[90px_1fr] gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-card-foreground">{value}</dd>
                </div>
              ))}
          </dl>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-bold text-foreground">Description</h2>
          <div className="space-y-4 text-sm leading-relaxed text-gray-600 dark:text-white/70">
            {(detail.description ?? "")
              .replace(/<br\s*\/?>/gi, "\n")
              .replace(/<[^>]+>/g, "")
              .split("\n")
              .map((p) => p.trim())
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-foreground">Episodes</h2>
        <DetailEpisodeList animeId={animeId} />
      </div>

      {recs.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-foreground">Special For You</h2>
          <div className="-mx-4 -my-4">
            <ScrollRow className="gap-3 px-4 py-4">
              {recs.map((anime, i) => (
                <div key={anime.id} className="w-[148px] shrink-0">
                  <AnimeCard anime={anime} index={i} />
                </div>
              ))}
            </ScrollRow>
          </div>
        </div>
      )}
    </div>
  );
}


function relationToMedia(node: RelationEntry["node"]): AnimeMedia {
  return {
    id: node.id,
    title: { romaji: node.title.romaji, english: node.title.english, native: null },
    coverImage: { large: node.coverImage.large, extraLarge: null },
    bannerImage: null,
    description: null,
    genres: [],
    averageScore: null,
    episodes: null,
    status: null,
    format: (node.format as AnimeMedia["format"]) ?? null,
    seasonYear: null,
  };
}

function RelationsTab({ edges }: { edges: RelationEntry[] }) {
  const animeEdges = edges.filter(({ node }) => node.type === "ANIME");
  if (animeEdges.length === 0)
    return <p className="text-sm text-muted-foreground">No related anime found.</p>;

  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {animeEdges.map(({ relationType, node }, i) => (
        <AnimeCard
          key={node.id}
          anime={relationToMedia(node)}
          statusLabel={formatStatus(relationType) ?? undefined}
          index={i}
        />
      ))}
    </div>
  );
}

function PeopleGrid({
  title,
  edges,
}: {
  title: string;
  edges: (CharacterEntry | StaffEntry)[];
}) {
  if (edges.length === 0)
    return <p className="text-sm text-muted-foreground">No {title.toLowerCase()} listed.</p>;

  return (
    <div>
      <h2 className="mb-5 text-xl font-bold text-foreground">{title}</h2>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {edges.map(({ role, node }, i) => (
          <div key={`${node.id}-${role}-${i}`}>
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-200 dark:bg-white/5">
              {node.image.large && (
                <Image src={node.image.large} alt="" fill sizes="180px" className="object-cover" />
              )}
            </div>
            <p className="mt-2 line-clamp-1 text-sm font-medium text-gray-800 dark:text-white/90">{node.name.full}</p>
            <p className="text-xs text-gray-500 dark:text-white/40">{formatStatus(role)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
