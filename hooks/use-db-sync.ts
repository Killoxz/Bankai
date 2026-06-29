"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useHistoryStore } from "@/store/history-store";
import { useWatchlistStore } from "@/store/watchlist-store";

export function useDBSync() {
  const userId = useAuthStore((s) => s.currentUser?.id);

  useEffect(() => {
    if (!userId) return;

    // Load history from DB and replace local state
    fetch(`/api/sync/history?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.entries?.length) {
          useHistoryStore.getState().hydrate(data.entries);
        }
      })
      .catch(() => {});

    // Load watchlist from DB and replace local state
    fetch(`/api/sync/watchlist?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.entries?.length || data.favorites?.length) {
          useWatchlistStore.getState().hydrate(data);
        }
      })
      .catch(() => {});
  }, [userId]);
}
