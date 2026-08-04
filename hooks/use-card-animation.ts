"use client";

import { useRef, useCallback } from "react";
import { useCardAnimationStore } from "@/store/card-animation-store";

const TILT_X = 18;
const TILT_Y = 22;

export function useCardAnimation() {
  const cardAnimation = useCardAnimationStore((s) => s.cardAnimation);

  const wrapRef  = useRef<HTMLDivElement>(null);
  const cardRef  = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const bgRef    = useRef<HTMLDivElement>(null);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const card  = cardRef.current;
      const glare = glareRef.current;
      if (!card) return;

      if (cardAnimation === "hover") {
        card.style.transform = "scale3d(1.05,1.05,1.05)";
        return;
      }

      if (cardAnimation === "float") {
        // Guard: don't reset the animation every mousemove — only start it once
        if (card.style.animationName === "card-float") return;
        card.style.transform = "";
        card.style.animation = "card-float 3s ease-in-out infinite";
        return;
      }

      // tilt
      const wrap = wrapRef.current;
      if (!wrap) return;
      const { left, top, width, height } = wrap.getBoundingClientRect();
      const x = (e.clientX - left) / width;
      const y = (e.clientY - top) / height;

      const rY = (x - 0.5) * TILT_Y * 2;
      const rX = -(y - 0.5) * TILT_X * 2;

      const isDark =
        document.documentElement.classList.contains("dark") ||
        document.documentElement.classList.contains("anilist");
      const sa = isDark ? "0.55" : "0.12";
      const sb = isDark ? "0.40" : "0.08";

      card.style.transform = `rotateX(${rX}deg) rotateY(${rY}deg) scale3d(1.07,1.07,1.07)`;
      card.style.boxShadow = `${-rY * 1.2}px ${rX * 1.2}px 40px rgba(0,0,0,${sa}), 0 8px 24px rgba(0,0,0,${sb})`;

      if (glare) {
        glare.style.opacity = "1";
        glare.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.22) 0%, transparent 62%)`;
      }
    },
    [cardAnimation]
  );

  const onLeave = useCallback(() => {
    const card  = cardRef.current;
    const glare = glareRef.current;
    const bg    = bgRef.current;
    if (!card) return;
    card.style.animation  = "";
    card.style.transform  = "rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    card.style.boxShadow  = "";
    if (bg) bg.style.transform = "";
    if (glare) {
      glare.style.opacity    = "0";
      glare.style.background = "";
      glare.style.transform  = "";
    }
  }, []);

  return { wrapRef, cardRef, glareRef, bgRef, onMove, onLeave };
}
