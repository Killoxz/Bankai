import Image from "next/image";
import Link from "next/link";
import type { AnimeMedia, RelationEntry } from "@/lib/anilist";
import { preferredTitle } from "@/lib/anilist";

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
      className="group flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-white/5"
    >
      <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-white/5">
        {coverImage && (
          <Image src={coverImage} alt="" fill sizes="44px" className="object-cover" />
        )}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-1 text-sm font-medium text-white/90 group-hover:text-white">
          {title}
        </p>
        {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
      </div>
    </Link>
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
  const relatedAnime = relations
    .filter((r) => r.node.format !== null)
    .slice(0, 5);
  const suggested = recommendations.slice(0, 5);

  return (
    <div className="space-y-8">
      {relatedAnime.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Related Series</h3>
            <span className="text-xs font-medium text-white/40">VIEW ALL</span>
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
            <h3 className="text-sm font-bold text-white">Suggested Series</h3>
            <span className="text-xs font-medium text-white/40">VIEW ALL</span>
          </div>
          <div className="space-y-1">
            {suggested.map((anime) => (
              <SeriesRow
                key={anime.id}
                id={anime.id}
                title={preferredTitle(anime)}
                coverImage={anime.coverImage.large}
                subtitle={[anime.seasonYear, formatLabel(anime.format)].filter(Boolean).join(" · ")}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
