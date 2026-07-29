"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TitleLanguage = "romaji" | "english" | "native";

interface LanguageState {
  titleLanguage: TitleLanguage;
  setTitleLanguage: (lang: TitleLanguage) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      titleLanguage: "english",
      setTitleLanguage: (titleLanguage) => set({ titleLanguage }),
    }),
    { name: "bankai-language" }
  )
);
