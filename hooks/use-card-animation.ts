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

      if (cardAnimation === "depth") {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const { left, top, width, height } = wrap.getBoundingClientRect();
        const x  = (e.clientX - left) / width;   // 0–1
        const y  = (e.clientY - top)  / height;  // 0–1
        const dx = x - 0.5;  // −0.5 to 0.5
        const dy = y - 0.5;

        // Gentle card tilt — less aggressive than tilt mode
        const rY = dx * 14;
        const rX = -dy * 10;
        card.style.transform = `rotateX(${rX}deg) rotateY(${rY}deg) scale3d(1.04,1.04,1.04)`;
        card.style.boxShadow = `${-dx * 22}px ${dy * 16}px 40px rgba(0,0,0,0.50), 0 8px 24px rgba(0,0,0,0.30)`;

        // Background layer: drifts opposite the cursor (it's "far away")
        // Scale up slightly so edges never show during translation
        const bg = bgRef.current;
        if (bg) {
          bg.style.transform = `translate3d(${-dx * 14}px, ${-dy * 14}px, 0) scale(1.08)`;
        }

        // Foreground glare: tracks cursor at surface speed — feels closest to viewer
        if (glare) {
          glare.style.opacity    = "1";
          glare.style.transform  = `translate3d(${dx * 6}px, ${dy * 6}px, 0)`;
          glare.style.background =
            `radial-gradient(circle 60% at ${Math.round(x * 100)}% ${Math.round(y * 100)}%,` +
            `rgba(255,255,255,0.20) 0%, transparent 65%)`;
        }
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
    card.style.transform  = "rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    card.style.boxShadow  = "";
    if (bg) {
      bg.style.transform  = "translate3d(0,0,0) scale(1.08)";
    }
    if (glare) {
      glare.style.opacity    = "0";
      glare.style.background = "";
      glare.style.transform  = "";
    }
  }, []);

  return { wrapRef, cardRef, glareRef, bgRef, onMove, onLeave };
}
