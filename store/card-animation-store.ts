"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CardAnimation = "tilt" | "hover" | "glow";

interface CardAnimationState {
  cardAnimation: CardAnimation;
  setCardAnimation: (a: CardAnimation) => void;
}

export const useCardAnimationStore = create<CardAnimationState>()(
  persist(
    (set) => ({
      cardAnimation: "tilt",
      setCardAnimation: (cardAnimation) => set({ cardAnimation }),
    }),
    { name: "bankai-card-animation" }
  )
);
