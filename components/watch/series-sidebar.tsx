"use client";

import Image from "next/image";
import Link from "next/link";
import type { AnimeMedia, RelationEntry } from "@/lib/anilist";
import { usePreferredTitle } from "@/lib/anilist";

function SeriesRow({
  id,
  title,
  coverImage,
  subtitle,
}: {
  id: number;
  title: string;
  coverImage: string;
  subtitle?: string;
}) {
  return (
    <Link
      href={`/watch/${id}`}
      className="group flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-accent"
    >
      <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
        {coverImage && (
          <Image src={coverImage} alt="" fill sizes="44px" className="object-cover" />
        )}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-1 text-sm font-medium text-foreground">
          {title}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </Link>
  );
}

function SuggestedSeriesRow({ anime }: { anime: AnimeMedia }) {
  const title = usePreferredTitle(anime);
  return (
    <SeriesRow
      id={anime.id}
      title={title}
      coverImage={anime.coverImage.large}
      subtitle={[anime.seasonYear, formatLabel(anime.format)].filter(Boolean).join(" · ")}
    />
  );
}

function formatLabel(format: string | null): string | undefined {
  if (!format) return undefined;
  return format.toLowerCase().split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export function SeriesSidebar({
  relations,
  recommendations,
}: {
  relations: RelationEntry[];
  recommendations: AnimeMedia[];
}) {
  // Relations include manga nodes (e.g. source material) that have no
  // matching /watch/[id] page and would 404 on click.
  const relatedAnime = relations
    .filter((r) => r.node.type === "ANIME")
    .slice(0, 5);
  const suggested = recommendations.slice(0, 5);

  return (
    <div className="space-y-8">
      {relatedAnime.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Related Series</h3>
            <span className="text-xs font-medium text-muted-foreground">VIEW ALL</span>
          </div>
          <div className="space-y-1">
            {relatedAnime.map(({ node, relationType }) => (
              <SeriesRow
                key={node.id}
                id={node.id}
                title={node.title.english || node.title.romaji}
                coverImage={node.coverImage.large}
                subtitle={formatLabel(relationType)}
              />
            ))}
          </div>
        </div>
      )}

      {suggested.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Suggested Series</h3>
            <span className="text-xs font-medium text-muted-foreground">VIEW ALL</span>
          </div>
          <div className="space-y-1">
            {suggested.map((anime) => (
              <SuggestedSeriesRow key={anime.id} anime={anime} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
