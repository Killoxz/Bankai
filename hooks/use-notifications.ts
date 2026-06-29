"use client";

import { useEffect, useMemo, useState } from "react";
import { useWatchlistStore } from "@/store/watchlist-store";
import { useHistoryStore } from "@/store/history-store";
import { api } from "@/services/client";
import type { AnimeCard } from "@/types/anime";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  href: string;
  coverImage?: string;
  unread: boolean;
}

const READ_KEY = "bankai-notif-read";

function getRead(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveRead(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {}
}

export function useNotifications() {
  const entries = useWatchlistStore((s) => s.entries);
  const getFor = useHistoryStore((s) => s.getFor);
  const [airingMap, setAiringMap] = useState<Map<string, AnimeCard>>(new Map());
  const [read, setRead] = useState<Set<string>>(new Set());

  // Load persisted read state once on mount
  useEffect(() => {
    setRead(getRead());
  }, []);

  // Fetch live episode counts for WATCHING entries once on mount
  useEffect(() => {
    const watchingIds = entries
      .filter((e) => e.status === "WATCHING")
      .map((e) => e.anime.id);

    if (watchingIds.length === 0) return;

    // Pull currently airing, popular to get fresh currentEpisode counts
    api
      .browse({ status: "RELEASING", sort: "TRENDING_DESC", perPage: 50 })
      .then((data) => {
        const map = new Map<string, AnimeCard>();
        for (const a of data.items) map.set(a.id, a);
        setAiringMap(map);
      })
      .catch(() => {});
  }, [entries.length]); // re-fetch if user adds to watchlist

  const notifications = useMemo<AppNotification[]>(() => {
    const result: AppNotification[] = [];

    for (const entry of entries) {
      const { anime } = entry;

      // New episode available for shows the user is actively watching
      if (entry.status === "WATCHING" && anime.status === "RELEASING") {
        const fresh = airingMap.get(anime.id) ?? anime;
        const currentEp = fresh.currentEpisode ?? 0;
        if (currentEp === 0) continue;

        const history = getFor(anime.id);
        const lastWatched = history?.episode ?? 0;

        if (currentEp > lastWatched) {
          const newEps = currentEp - lastWatched;
          const id = `new-ep-${anime.id}-${currentEp}`;
          result.push({
            id,
            title: anime.title.romaji ?? anime.title.english ?? "Unknown",
            body:
              newEps === 1
                ? `Episode ${currentEp} is now available`
                : `${newEps} new episodes available (up to EP ${currentEp})`,
            time: "Airing now",
            href: `/watch/${anime.slug}?ep=${lastWatched + 1}`,
            coverImage: anime.coverImage,
            unread: !read.has(id),
          });
        }
      }

      // Plan-to-watch shows that have now started airing
      if (entry.status === "PLAN_TO_WATCH" && anime.status === "RELEASING") {
        const id = `ptw-airing-${anime.id}`;
        result.push({
          id,
          title: anime.title.romaji ?? anime.title.english ?? "Unknown",
          body: "Has started airing — time to watch!",
          time: "Now airing",
          href: `/anime/${anime.slug}`,
          coverImage: anime.coverImage,
          unread: !read.has(id),
        });
      }

      // Completed shows
      if (
        (entry.status === "WATCHING" || entry.status === "PLAN_TO_WATCH") &&
        anime.status === "FINISHED"
      ) {
        const id = `finished-${anime.id}`;
        result.push({
          id,
          title: anime.title.romaji ?? anime.title.english ?? "Unknown",
          body: `Finished airing — all ${anime.episodes ?? "?"} episodes are available`,
          time: "Completed",
          href: `/anime/${anime.slug}`,
          coverImage: anime.coverImage,
          unread: !read.has(id),
        });
      }
    }

    return result;
  }, [entries, airingMap, getFor, read]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  function markAllRead() {
    const ids = new Set(notifications.map((n) => n.id));
    setRead(ids);
    saveRead(ids);
  }

  return { notifications, unreadCount, markAllRead };
}
