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
  volumeBoost: number;       // 0–200 (percent above 100%)
  announcements: boolean;
  keyboardAnimations: boolean;
  setCaptionsOn: (v: boolean) => void;
  setCaptionSize: (v: string) => void;
  setCaptionColor: (v: string) => void;
  setCaptionBg: (v: string) => void;
  setCaptionFont: (v: string) => void;
  setSpeed: (v: number) => void;
  setAlwaysHD: (v: boolean) => void;
  setVolumeBoost: (v: number) => void;
  setAnnouncements: (v: boolean) => void;
  setKeyboardAnimations: (v: boolean) => void;
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
      volumeBoost: 0,
      announcements: true,
      keyboardAnimations: true,
      setCaptionsOn: (captionsOn) => set({ captionsOn }),
      setCaptionSize: (captionSize) => set({ captionSize }),
      setCaptionColor: (captionColor) => set({ captionColor }),
      setCaptionBg: (captionBg) => set({ captionBg }),
      setCaptionFont: (captionFont) => set({ captionFont }),
      setSpeed: (speed) => set({ speed }),
      setAlwaysHD: (alwaysHD) => set({ alwaysHD }),
      setVolumeBoost: (volumeBoost) => set({ volumeBoost }),
      setAnnouncements: (announcements) => set({ announcements }),
      setKeyboardAnimations: (keyboardAnimations) => set({ keyboardAnimations }),
    }),
    { name: "bankai-player-prefs" }
  )
);
