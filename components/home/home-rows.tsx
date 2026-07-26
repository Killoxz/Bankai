"use client";

import { useState } from "react";
import { AnimeRow } from "./anime-row";
import type { AnimeMedia } from "@/lib/anilist";

// Real AniList genre names only, so every pill actually filters results
const GENRES = [
  "All Genres",
  "Action",
  "Fantasy",
  "Slice of Life",
  "Adventure",
  "Comedy",
  "Romance",
  "Drama",
  "Supernatural",
  "Sci-Fi",
  "Mystery",
  "Psychological",
  "Sports",
  "Horror",
  "Music",
  "Thriller",
  "Mecha",
];

export function HomeRows({
  popular,
  newSeason,
  topRated,
}: {
  popular: AnimeMedia[];
  newSeason: AnimeMedia[];
  topRated: AnimeMedia[];
}) {
  const [genre, setGenre] = useState("All Genres");
  const byGenre = (list: AnimeMedia[]) =>
    genre === "All Genres" ? list : list.filter((a) => a.genres.includes(genre));

  const continueWatching = byGenre(popular).slice(0, 12);
  const season = byGenre(newSeason);
  const recommended = byGenre(topRated);
  const empty =
    continueWatching.length + season.length + recommended.length === 0;

  return (
    <>
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={
              g === genre
                ? "flex-shrink-0 whitespace-nowrap rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black"
                : "flex-shrink-0 whitespace-nowrap rounded-full border border-white/25 px-4 py-1.5 text-sm font-medium text-white/75 transition-colors hover:border-white/50 hover:text-white"
            }
          >
            {g}
          </button>
        ))}
      </div>

      {empty ? (
        <p className="py-10 text-center text-sm text-white/40">
          Nothing in {genre} right now — try another genre.
        </p>
      ) : (
        <>
          <AnimeRow title="Continue Watching for You" items={continueWatching} showProgress />
          <AnimeRow title="New Season" items={season} showBadge />
          <AnimeRow title="Recommended For You" items={recommended} />
        </>
      )}
    </>
  );
}
