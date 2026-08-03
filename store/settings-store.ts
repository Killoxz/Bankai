"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CardLayout    = "default" | "anichart" | "row";
export type CardSize      = "small"   | "medium"   | "large";
export type EpisodeLayout = "list"    | "grid"     | "image";

/** The serialisable subset written to/from the remote settings blob. */
export interface SettingsData {
  showWatchHistory:   boolean;
  cardLayout:         CardLayout;
  cardSize:           CardSize;
  episodeLayout:      EpisodeLayout;
  defaultProvider:    string;
  autoPlay:           boolean;
  autoSkipIntroOutro: boolean;
  autoNextEpisode:    boolean;
  showComments:       boolean;
  notifNewEp:         boolean;
  notifTrending:      boolean;
}

interface SettingsState extends SettingsData {
  setShowWatchHistory:   (v: boolean)       => void;
  setCardLayout:         (v: CardLayout)    => void;
  setCardSize:           (v: CardSize)      => void;
  setEpisodeLayout:      (v: EpisodeLayout) => void;
  setDefaultProvider:    (v: string)        => void;
  setAutoPlay:           (v: boolean)       => void;
  setAutoSkipIntroOutro: (v: boolean)       => void;
  setAutoNextEpisode:    (v: boolean)       => void;
  setShowComments:       (v: boolean)       => void;
  setNotifNewEp:         (v: boolean)       => void;
  setNotifTrending:      (v: boolean)       => void;
  /** Bulk-apply remote settings in a single setState call (no extra renders). */
  _applyRemote:          (data: Partial<SettingsData>) => void;
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

      _applyRemote: (data) => set(data),
    }),
    { name: "bankai-settings" }
  )
);
