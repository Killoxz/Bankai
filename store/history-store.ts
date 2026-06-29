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
  hydrate: (entries: HistoryEntry[]) => void;
}

function userId(): string | null {
  try {
    const raw = localStorage.getItem("bankai-auth");
    if (!raw) return null;
    return JSON.parse(raw)?.state?.currentUser?.id ?? null;
  } catch { return null; }
}

function syncUpsert(entry: Omit<HistoryEntry, "updatedAt">) {
  const uid = userId();
  if (!uid) return;
  fetch("/api/sync/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: uid, anime: entry.anime, episode: entry.episode, progress: entry.progress, duration: entry.duration }),
  }).catch(() => {});
}

function syncRemove(animeId: string) {
  const uid = userId();
  if (!uid) return;
  fetch(`/api/sync/history?userId=${uid}&animeId=${encodeURIComponent(animeId)}`, { method: "DELETE" }).catch(() => {});
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      upsert: (entry) => {
        set((s) => {
          const others = s.entries.filter((e) => e.anime.id !== entry.anime.id);
          return {
            entries: [{ ...entry, updatedAt: Date.now() }, ...others].slice(0, 100),
          };
        });
        syncUpsert(entry);
      },

      remove: (animeId) => {
        set((s) => ({ entries: s.entries.filter((e) => e.anime.id !== animeId) }));
        syncRemove(animeId);
      },

      clear: () => set({ entries: [] }),

      getFor: (animeId) => get().entries.find((e) => e.anime.id === animeId),

      hydrate: (entries) => set({ entries }),
    }),
    { name: "bankai-history" }
  )
);
