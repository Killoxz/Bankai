import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PlayerSettings {
  volume: number;
  muted: boolean;
  playbackRate: number;
  autoPlay: boolean;
  autoNext: boolean;
  autoSkipIntro: boolean;
  category: "sub" | "dub";
  quality: string;
  server: string;
  subtitleLang: string;
  subtitleSize: number;
  // UI preferences
  episodeLayout: "grid" | "list";
  showHistory: "show" | "hide";
  showComments: boolean;
  cardLayout: "classic" | "anichart" | "rowlist";
  cardSize: "medium" | "large";
  titleLanguage: "romaji" | "english" | "native";
  homeLayout: "default" | "compact" | "spotlight" | "classic";
  setSettings: (patch: Partial<Omit<PlayerSettings, "setSettings">>) => void;
}

export const usePlayerStore = create<PlayerSettings>()(
  persist(
    (set) => ({
      volume: 1,
      muted: false,
      playbackRate: 1,
      autoPlay: true,
      autoNext: true,
      autoSkipIntro: false,
      category: "sub",
      quality: "auto",
      server: "Kiwi",
      subtitleLang: "English",
      subtitleSize: 20,
      episodeLayout: "list",
      showHistory: "show",
      showComments: true,
      cardLayout: "classic",
      cardSize: "medium",
      titleLanguage: "romaji",
      homeLayout: "classic",
      setSettings: (patch) => set(patch),
    }),
    { name: "bankai-player" }
  )
);
