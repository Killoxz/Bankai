"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye, Bookmark, Check } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { ReviewsSection } from "./reviews-section";
import {
  usePreferredTitle,
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
                ? "border-white text-white"
                : "border-transparent text-white/45 hover:text-white/75",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="py-8">
        {tab === "overview" && <OverviewTab detail={detail} />}
        {tab === "relations" && <RelationsTab edges={detail.relations.edges} />}
        {tab === "characters" && <PeopleGrid title="Anime Characters" edges={detail.characters.edges} />}
        {tab === "staff" && <PeopleGrid title="Staff" edges={detail.staff.edges} />}
        {tab === "reviews" && <ReviewsSection animeId={animeId} />}
      </div>
    </div>
  );
}

function OverviewTab({ detail }: { detail: AnimeDetail }) {
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
          <h2 className="mb-4 text-xl font-bold text-white">Details</h2>
          <dl className="space-y-3 text-sm">
            {details
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label} className="grid grid-cols-[90px_1fr] gap-3">
                  <dt className="text-white/45">{label}</dt>
                  <dd className="text-white/85">{value}</dd>
                </div>
              ))}
          </dl>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-bold text-white">Description</h2>
          <div className="space-y-4 text-sm leading-relaxed text-white/70">
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

      {recs.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-white">Special For You</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {recs.map((anime) => (
              <RecommendationCard key={anime.id} anime={anime} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ anime }: { anime: AnimeMedia }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [status, setStatus] = useState<"WATCHING" | "PLAN_TO_WATCH" | "COMPLETED" | null>(null);
  const title = usePreferredTitle(anime);

  async function quickSet(key: "WATCHING" | "PLAN_TO_WATCH" | "COMPLETED") {
    if (!currentUser) {
      window.location.href = "/login";
      return;
    }
    const next = status === key ? null : key;
    setStatus(next);
    try {
      await fetch(`/api/anime/${anime.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser, status: next }),
      });
    } catch {
      setStatus(status);
    }
  }

  return (
    <div className="group w-[170px] shrink-0">
      <Link href={`/anime/${anime.id}`}>
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white/5">
          {anime.coverImage.large && (
            <Image
              src={anime.coverImage.large}
              alt={title}
              fill
              sizes="170px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
          {anime.averageScore && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white">
              ★ {(anime.averageScore / 10).toFixed(1)}
            </span>
          )}
        </div>
      </Link>
      <div className="mt-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <QuickAction icon={Bookmark} active={status === "PLAN_TO_WATCH"} onClick={() => quickSet("PLAN_TO_WATCH")} />
        <QuickAction icon={Eye} active={status === "WATCHING"} onClick={() => quickSet("WATCHING")} />
        <QuickAction icon={Check} active={status === "COMPLETED"} onClick={() => quickSet("COMPLETED")} />
      </div>
      <Link href={`/anime/${anime.id}`}>
        <p className="mt-1.5 line-clamp-1 text-sm font-medium text-white/90">{title}</p>
        <p className="text-xs text-white/40">
          {[anime.seasonYear, anime.genres[0]].filter(Boolean).join(", ")}
        </p>
      </Link>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  active,
  onClick,
}: {
  icon: typeof Eye;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={[
        "grid size-8 place-items-center rounded-full transition-colors",
        active ? "bg-primary text-black" : "bg-black/70 text-white hover:bg-black",
      ].join(" ")}
    >
      <Icon className="size-3.5" />
    </button>
  );
}

function RelationsTab({ edges }: { edges: RelationEntry[] }) {
  if (edges.length === 0)
    return <p className="text-sm text-white/40">No related anime found.</p>;

  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {edges.map(({ relationType, node }) => (
        <Link key={node.id} href={`/anime/${node.id}`} className="group">
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white/5">
            {node.coverImage.large && (
              <Image
                src={node.coverImage.large}
                alt=""
                fill
                sizes="180px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
          </div>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {formatStatus(relationType)}
          </p>
          <p className="line-clamp-2 text-sm font-medium text-white/90">
            {node.title.english || node.title.romaji}
          </p>
        </Link>
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
    return <p className="text-sm text-white/40">No {title.toLowerCase()} listed.</p>;

  return (
    <div>
      <h2 className="mb-5 text-xl font-bold text-white">{title}</h2>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {edges.map(({ role, node }, i) => (
          <div key={`${node.id}-${role}-${i}`}>
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-white/5">
              {node.image.large && (
                <Image src={node.image.large} alt="" fill sizes="180px" className="object-cover" />
              )}
            </div>
            <p className="mt-2 line-clamp-1 text-sm font-medium text-white/90">{node.name.full}</p>
            <p className="text-xs text-white/40">{formatStatus(role)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
