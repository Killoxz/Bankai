import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnimeCard } from "@/types/anime";

export interface HistoryEntry {
  anime: AnimeCard;
  episode: number;
  progress: number; // seconds watched
  duration: number; // total seconds
  updatedAt: number; // epoch ms
  episodeThumbnail?: string | null;
}

interface HistoryState {
  entries: HistoryEntry[];
  upsert: (entry: Omit<HistoryEntry, "updatedAt">) => void;
  remove: (animeId: string) => void;
  clear: () => void;
  getFor: (animeId: string) => HistoryEntry | undefined;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      upsert: (entry) =>
        set((s) => {
          const others = s.entries.filter((e) => e.anime.id !== entry.anime.id);
          return {
            entries: [{ ...entry, updatedAt: Date.now() }, ...others].slice(0, 100),
          };
        }),
      remove: (animeId) =>
        set((s) => ({ entries: s.entries.filter((e) => e.anime.id !== animeId) })),
      clear: () => set({ entries: [] }),
      getFor: (animeId) => get().entries.find((e) => e.anime.id === animeId),
    }),
    { name: "bankai-history" }
  )
);
