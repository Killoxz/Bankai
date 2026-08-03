"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CardLayout    = "default" | "anichart" | "row";
export type CardSize      = "small"   | "medium"   | "large";
export type EpisodeLayout = "list"    | "grid"     | "image";

interface SettingsState {
  // Home
  showWatchHistory: boolean;
  setShowWatchHistory: (v: boolean) => void;
  // Appearance
  cardLayout: CardLayout;
  setCardLayout: (v: CardLayout) => void;
  cardSize: CardSize;
  setCardSize: (v: CardSize) => void;
  // Episode list
  episodeLayout: EpisodeLayout;
  setEpisodeLayout: (v: EpisodeLayout) => void;
  // Media
  defaultProvider: string;
  setDefaultProvider: (v: string) => void;
  autoPlay: boolean;
  setAutoPlay: (v: boolean) => void;
  autoSkipIntroOutro: boolean;
  setAutoSkipIntroOutro: (v: boolean) => void;
  autoNextEpisode: boolean;
  setAutoNextEpisode: (v: boolean) => void;
  // Comments
  showComments: boolean;
  setShowComments: (v: boolean) => void;
  // Notifications
  notifNewEp: boolean;
  setNotifNewEp: (v: boolean) => void;
  notifTrending: boolean;
  setNotifTrending: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      showWatchHistory:    true,
      setShowWatchHistory: (v) => set({ showWatchHistory: v }),

      cardLayout:    "default",
      setCardLayout: (v) => set({ cardLayout: v }),

      cardSize:    "medium",
      setCardSize: (v) => set({ cardSize: v }),

      episodeLayout:    "list",
      setEpisodeLayout: (v) => set({ episodeLayout: v }),

      defaultProvider:    "auto",
      setDefaultProvider: (v) => set({ defaultProvider: v }),

      autoPlay:    true,
      setAutoPlay: (v) => set({ autoPlay: v }),

      autoSkipIntroOutro:    true,
      setAutoSkipIntroOutro: (v) => set({ autoSkipIntroOutro: v }),

      autoNextEpisode:    true,
      setAutoNextEpisode: (v) => set({ autoNextEpisode: v }),

      showComments:    true,
      setShowComments: (v) => set({ showComments: v }),

      notifNewEp:    true,
      setNotifNewEp: (v) => set({ notifNewEp: v }),

      notifTrending:    false,
      setNotifTrending: (v) => set({ notifTrending: v }),
    }),
    { name: "bankai-settings" }
  )
);
