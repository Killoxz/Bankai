import { AnimeCard, AnimeCardSkeleton } from "./anime-card";
import type { AnimeCard as TAnimeCard } from "@/types/anime";

export function AnimeGrid({ items }: { items: TAnimeCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {items.map((anime, i) => (
        <AnimeCard key={anime.id} anime={anime} index={i} />
      ))}
    </div>
  );
}

export function AnimeGridSkeleton({ count = 14 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {Array.from({ length: count }).map((_, i) => (
        <AnimeCardSkeleton key={i} />
      ))}
    </div>
  );
}
