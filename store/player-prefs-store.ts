"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PlayerPrefsState {
  captionsOn: boolean;
  captionSize: string;
  captionColor: string;
  captionBg: string;
  captionFont: string;
  speed: number;
  alwaysHD: boolean;
  setCaptionsOn: (v: boolean) => void;
  setCaptionSize: (v: string) => void;
  setCaptionColor: (v: string) => void;
  setCaptionBg: (v: string) => void;
  setCaptionFont: (v: string) => void;
  setSpeed: (v: number) => void;
  setAlwaysHD: (v: boolean) => void;
}

export const usePlayerPrefsStore = create<PlayerPrefsState>()(
  persist(
    (set) => ({
      captionsOn: true,
      captionSize: "100",
      captionColor: "#ffffff",
      captionBg: "rgba(0,0,0,0.75)",
      captionFont: "inherit",
      speed: 1,
      alwaysHD: false,
      setCaptionsOn: (captionsOn) => set({ captionsOn }),
      setCaptionSize: (captionSize) => set({ captionSize }),
      setCaptionColor: (captionColor) => set({ captionColor }),
      setCaptionBg: (captionBg) => set({ captionBg }),
      setCaptionFont: (captionFont) => set({ captionFont }),
      setSpeed: (speed) => set({ speed }),
      setAlwaysHD: (alwaysHD) => set({ alwaysHD }),
    }),
    { name: "bankai-player-prefs" }
  )
);
