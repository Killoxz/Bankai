"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, Heart, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { AnimeCard } from "@/components/anime/anime-card";
import {
  useWatchlistStore,
  LIST_STATUS_LABELS,
  type ListStatus,
} from "@/store/watchlist-store";
import { useMounted } from "@/hooks/use-mounted";
import { preferredTitle } from "@/lib/utils";
import { usePlayerStore } from "@/store/player-store";

type Sort = "added" | "title" | "score";

export function WatchlistView() {
  const mounted = useMounted();
  const entries = useWatchlistStore((s) => s.entries);
  const favorites = useWatchlistStore((s) => s.favorites);
  const removeEntry = useWatchlistStore((s) => s.removeEntry);
  const toggleFavorite = useWatchlistStore((s) => s.toggleFavorite);
  const [sort, setSort] = useState<Sort>("added");
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);

  const sortFn = useMemo(() => {
    return (a: { addedAt: number; anime: { title: { romaji: string }; averageScore?: number | null } }, b: typeof a) => {
      if (sort === "title") return preferredTitle(a.anime.title, titleLanguage).localeCompare(preferredTitle(b.anime.title, titleLanguage));
      if (sort === "score") return (b.anime.averageScore ?? 0) - (a.anime.averageScore ?? 0);
      return b.addedAt - a.addedAt;
    };
  }, [sort]);

  const statuses: (ListStatus | "ALL" | "FAVORITES")[] = [
    "ALL",
    "WATCHING",
    "PLAN_TO_WATCH",
    "COMPLETED",
    "ON_HOLD",
    "DROPPED",
    "FAVORITES",
  ];

  const countFor = (s: ListStatus | "ALL" | "FAVORITES") =>
    s === "FAVORITES" ? favorites.length : s === "ALL" ? entries.length : entries.filter((e) => e.status === s).length;

  return (
    <Tabs defaultValue="ALL" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          {statuses.map((s) => (
            <TabsTrigger key={s} value={s}>
              {s === "ALL" ? "All" : s === "FAVORITES" ? "Favorites" : LIST_STATUS_LABELS[s]}
              {mounted && <span className="ml-1.5 text-xs text-muted-foreground">{countFor(s)}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
        <Select
          aria-label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          options={[
            { label: "Recently added", value: "added" },
            { label: "Title A-Z", value: "title" },
            { label: "Score", value: "score" },
          ]}
        />
      </div>

      {statuses.map((s) => {
        if (s === "FAVORITES") {
          return (
            <TabsContent key={s} value={s}>
              {mounted && favorites.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {favorites.map((a, i) => (
                    <div key={a.id} className="relative">
                      <AnimeCard anime={a} index={i} />
                      <button
                        onClick={() => toggleFavorite(a)}
                        aria-label="Remove favorite"
                        className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-rose-400 backdrop-blur"
                      >
                        <Heart className="size-4 fill-current" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty icon={<Heart className="size-8" />} text="No favorites yet." />
              )}
            </TabsContent>
          );
        }
        const list = (s === "ALL" ? entries : entries.filter((e) => e.status === s))
          .slice()
          .sort(sortFn);
        return (
          <TabsContent key={s} value={s}>
            {mounted && list.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {list.map((e, i) => (
                  <div key={e.anime.id} className="relative">
                    <AnimeCard anime={e.anime} index={i} />
                    <button
                      onClick={() => removeEntry(e.anime.id)}
                      aria-label="Remove"
                      className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white backdrop-blur hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon={<Bookmark className="size-8" />} text="Nothing here yet." />
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="grid place-items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
      {icon}
      <p className="text-sm">{text}</p>
      <Link href="/trending" className={`${buttonVariants()} mt-1`}>Find something to watch</Link>
    </div>
  );
}
