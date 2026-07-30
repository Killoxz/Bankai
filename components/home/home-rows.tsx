"use client";

import { useEffect, useState } from "react";
import { AnimeRow } from "./anime-row";
import { ScrollRow } from "./scroll-row";
import { useAuthStore } from "@/store/auth-store";
import { ANIME_GENRES, type AnimeMedia } from "@/lib/anilist";

const GENRES = ["All Genres", ...ANIME_GENRES];

interface ProfileAnimeStub {
  id: string; // "anilist:<id>"
  title: string;
  coverImage: string | null;
  seasonYear: number | null;
  genres: string[];
  format: string | null;
}

function toAnimeMedia(stub: ProfileAnimeStub): AnimeMedia | null {
  const match = stub.id.match(/^anilist:(\d+)$/);
  if (!match || !stub.coverImage) return null;
  return {
    id: Number(match[1]),
    title: { romaji: stub.title, english: null, native: null },
    coverImage: { large: stub.coverImage, extraLarge: null },
    bannerImage: null,
    description: null,
    genres: stub.genres,
    averageScore: null,
    episodes: null,
    status: null,
    format: (stub.format as AnimeMedia["format"]) ?? null,
    seasonYear: stub.seasonYear,
  };
}

function useContinueWatching(): { items: AnimeMedia[]; loading: boolean; loggedIn: boolean } {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<AnimeMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!currentUser) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/profile?username=${encodeURIComponent(currentUser)}`)
      .then((res) => res.json())
      .then((json) => {
        const watching: ProfileAnimeStub[] = json?.lists?.watching ?? [];
        setItems(watching.map(toAnimeMedia).filter((m): m is AnimeMedia => !!m));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [mounted, currentUser]);

  return { items, loading, loggedIn: mounted && !!currentUser };
}

export function HomeRows({
  newSeason,
  topRated,
}: {
  newSeason: AnimeMedia[];
  topRated: AnimeMedia[];
}) {
  const [genre, setGenre] = useState("All Genres");
  const byGenre = (list: AnimeMedia[]) =>
    genre === "All Genres" ? list : list.filter((a) => a.genres.includes(genre));

  const { items: watching, loading: watchingLoading, loggedIn } = useContinueWatching();
  const continueWatching = byGenre(watching);
  const season = byGenre(newSeason);
  const recommended = byGenre(topRated);

  return (
    <>
      <ScrollRow className="items-center gap-2 pb-1">
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
      </ScrollRow>

      {!watchingLoading && (
        continueWatching.length > 0 ? (
          <AnimeRow title="Continue Watching for You" items={continueWatching} showProgress />
        ) : (
          <section>
            <h2 className="mb-4 text-base font-semibold text-white">Continue Watching for You</h2>
            <p className="rounded-xl bg-white/5 py-8 text-center text-sm text-white/40">
              {loggedIn
                ? "Nothing here yet — mark an anime as Watching on its page and it'll show up here."
                : "Log in and mark something as Watching to see it here."}
            </p>
          </section>
        )
      )}

      <AnimeRow title="New Season" items={season} showBadge />
      <AnimeRow title="Recommended For You" items={recommended} />

      {season.length === 0 && recommended.length === 0 && continueWatching.length === 0 && (
        <p className="py-10 text-center text-sm text-white/40">
          Nothing in {genre} right now — try another genre.
        </p>
      )}
    </>
  );
}
