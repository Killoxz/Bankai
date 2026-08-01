"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TitleLanguage = "romaji" | "english" | "native";
export type DefaultAudio  = "sub" | "dub";

interface LanguageState {
  titleLanguage: TitleLanguage;
  setTitleLanguage: (lang: TitleLanguage) => void;
  defaultAudio: DefaultAudio;
  setDefaultAudio: (audio: DefaultAudio) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      titleLanguage: "english",
      setTitleLanguage: (titleLanguage) => set({ titleLanguage }),
      defaultAudio: "sub",
      setDefaultAudio: (defaultAudio) => set({ defaultAudio }),
    }),
    { name: "bankai-language" }
  )
);
