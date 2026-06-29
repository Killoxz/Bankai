import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnimeCard } from "@/types/anime";

export type ListStatus =
  | "WATCHING"
  | "COMPLETED"
  | "PLAN_TO_WATCH"
  | "DROPPED"
  | "ON_HOLD";

export const LIST_STATUS_LABELS: Record<ListStatus, string> = {
  WATCHING: "Watching",
  COMPLETED: "Completed",
  PLAN_TO_WATCH: "Plan to Watch",
  DROPPED: "Dropped",
  ON_HOLD: "On Hold",
};

export interface ListEntry {
  anime: AnimeCard;
  status: ListStatus;
  score?: number;
  folder?: string;
  addedAt: number;
}

interface WatchlistState {
  entries: ListEntry[];
  favorites: AnimeCard[];
  setStatus: (anime: AnimeCard, status: ListStatus) => void;
  removeEntry: (animeId: string) => void;
  toggleFavorite: (anime: AnimeCard) => void;
  isFavorite: (animeId: string) => boolean;
  getEntry: (animeId: string) => ListEntry | undefined;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      entries: [],
      favorites: [],
      setStatus: (anime, status) =>
        set((s) => {
          const others = s.entries.filter((e) => e.anime.id !== anime.id);
          const existing = s.entries.find((e) => e.anime.id === anime.id);
          return {
            entries: [
              { anime, status, addedAt: existing?.addedAt ?? Date.now(), score: existing?.score },
              ...others,
            ],
          };
        }),
      removeEntry: (animeId) =>
        set((s) => ({ entries: s.entries.filter((e) => e.anime.id !== animeId) })),
      toggleFavorite: (anime) =>
        set((s) => {
          const exists = s.favorites.some((a) => a.id === anime.id);
          return {
            favorites: exists
              ? s.favorites.filter((a) => a.id !== anime.id)
              : [anime, ...s.favorites],
          };
        }),
      isFavorite: (animeId) => get().favorites.some((a) => a.id === animeId),
      getEntry: (animeId) => get().entries.find((e) => e.anime.id === animeId),
    }),
    { name: "bankai-watchlist" }
  )
);
