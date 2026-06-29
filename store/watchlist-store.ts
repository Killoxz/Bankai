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
  hydrate: (data: { entries: ListEntry[]; favorites: AnimeCard[] }) => void;
}

function userId(): string | null {
  try {
    const raw = localStorage.getItem("bankai-auth");
    if (!raw) return null;
    return JSON.parse(raw)?.state?.currentUser?.id ?? null;
  } catch { return null; }
}

function syncPost(body: object) {
  const uid = userId();
  if (!uid) return;
  fetch("/api/sync/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: uid, ...body }),
  }).catch(() => {});
}

function syncDelete(animeId: string) {
  const uid = userId();
  if (!uid) return;
  fetch(`/api/sync/watchlist?userId=${uid}&animeId=${encodeURIComponent(animeId)}`, { method: "DELETE" }).catch(() => {});
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      entries: [],
      favorites: [],

      setStatus: (anime, status) => {
        set((s) => {
          const others = s.entries.filter((e) => e.anime.id !== anime.id);
          const existing = s.entries.find((e) => e.anime.id === anime.id);
          return {
            entries: [
              { anime, status, addedAt: existing?.addedAt ?? Date.now(), score: existing?.score },
              ...others,
            ],
          };
        });
        syncPost({ anime, action: "setStatus", status });
      },

      removeEntry: (animeId) => {
        set((s) => ({ entries: s.entries.filter((e) => e.anime.id !== animeId) }));
        syncDelete(animeId);
      },

      toggleFavorite: (anime) => {
        const isFavorite = get().favorites.some((a) => a.id === anime.id);
        set((s) => ({
          favorites: isFavorite
            ? s.favorites.filter((a) => a.id !== anime.id)
            : [anime, ...s.favorites],
        }));
        syncPost({ anime, action: "toggleFavorite", isFavorite });
      },

      isFavorite: (animeId) => get().favorites.some((a) => a.id === animeId),
      getEntry: (animeId) => get().entries.find((e) => e.anime.id === animeId),

      hydrate: (data) => set({ entries: data.entries, favorites: data.favorites }),
    }),
    { name: "bankai-watchlist" }
  )
);
