"use client";

import Link from "next/link";
import type { AnimeMedia, RelationEntry } from "@/lib/anilist";
import { usePreferredTitle } from "@/lib/anilist";

function fmtFormat(f: string | null | undefined): string | null {
  if (!f) return null;
  return f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SeriesCard({
  id,
  title,
  coverImage,
  format,
  episodes,
  score,
}: {
  id: number;
  title: string;
  coverImage: string;
  format?: string | null;
  episodes?: number | null;
  score?: number | null;
}) {
  return (
    <Link
      href={`/watch/${id}`}
      className="group relative flex items-center gap-3 overflow-hidden rounded-xl p-2 transition-colors duration-200 hover:brightness-110"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      {/* Blurred cover background on right */}
      {coverImage && (
        <>
          <img
            src={coverImage}
            alt=""
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-full w-3/5 object-cover object-right opacity-25 blur-[2px]"
          />
          {/* gradient wipe from left so thumbnail area stays clean */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#13141a] via-[#13141a]/90 to-transparent" />
        </>
      )}

      {/* Thumbnail */}
      <div className="relative z-10 size-14 shrink-0 overflow-hidden rounded-lg bg-white/10">
        {coverImage && (
          <img src={coverImage} alt="" className="size-full object-cover" />
        )}
      </div>

      {/* Info */}
      <div className="relative z-10 min-w-0 flex-1">
        {/* Dot + title */}
        <div className="flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-full bg-primary" />
          <p className="line-clamp-1 text-[13px] font-semibold leading-snug text-white">
            {title}
          </p>
        </div>

        {/* Metadata row */}
        {(format || episodes || score) && (
          <div className="mt-1 flex items-center gap-2.5 text-[11px] text-white/40">
            {format && <span>{fmtFormat(format)}</span>}
            {episodes && (
              <span className="flex items-center gap-1">
                <span
                  className="material-symbols-rounded select-none"
                  aria-hidden
                  style={{ fontSize: 12, lineHeight: 1, fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 20" }}
                >
                  closed_caption
                </span>
                {episodes}
              </span>
            )}
            {score && (
              <span className="flex items-center gap-0.5">
                <span
                  className="material-symbols-rounded select-none text-amber-400"
                  aria-hidden
                  style={{ fontSize: 11, lineHeight: 1, fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20" }}
                >
                  star
                </span>
                {score}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function SuggestedCard({ anime }: { anime: AnimeMedia }) {
  const title = usePreferredTitle(anime);
  return (
    <SeriesCard
      id={anime.id}
      title={title}
      coverImage={anime.coverImage.large}
      format={anime.format}
      episodes={anime.episodes}
      score={anime.averageScore}
    />
  );
}

export function SeriesSidebar({
  relations,
  recommendations,
}: {
  relations: RelationEntry[];
  recommendations: AnimeMedia[];
}) {
  const relatedAnime = relations.filter((r) => r.node.type === "ANIME").slice(0, 5);
  const suggested    = recommendations.slice(0, 5);

  return (
    <div className="space-y-6">
      {relatedAnime.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between px-0.5">
            <h3 className="text-sm font-bold text-foreground">Related Series</h3>
            <span className="text-xs font-medium text-muted-foreground">VIEW ALL</span>
          </div>
          <div className="space-y-1.5">
            {relatedAnime.map(({ node }) => (
              <SeriesCard
                key={node.id}
                id={node.id}
                title={node.title.english ?? node.title.romaji}
                coverImage={node.coverImage.large}
                format={node.format}
                episodes={node.episodes}
                score={node.averageScore}
              />
            ))}
          </div>
        </div>
      )}

      {suggested.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between px-0.5">
            <h3 className="text-sm font-bold text-foreground">Suggested Series</h3>
            <span className="text-xs font-medium text-muted-foreground">VIEW ALL</span>
          </div>
          <div className="space-y-1.5">
            {suggested.map((anime) => (
              <SuggestedCard key={anime.id} anime={anime} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
