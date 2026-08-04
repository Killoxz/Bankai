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

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const card  = cardRef.current;
      const glare = glareRef.current;
      if (!card) return;

      if (cardAnimation === "hover") {
        card.style.transform = "scale3d(1.05,1.05,1.05)";
        return;
      }

      if (cardAnimation === "glow") {
        // Aura: no rotation — a shifting color glow bleeds out from behind the card
        const wrap = wrapRef.current;
        if (!wrap) return;
        const { left, top, width, height } = wrap.getBoundingClientRect();
        const x = (e.clientX - left) / width;
        const y = (e.clientY - top) / height;

        // Hue sweeps 200–320 (cyan → blue → purple → magenta) as cursor moves
        const hue  = Math.round(200 + x * 120);
        const hue2 = (hue + 40) % 360;
        const hue3 = (hue + 80) % 360;

        // Flat — no tilt at all
        card.style.transform = "scale3d(1.06,1.06,1.06)";
        card.style.boxShadow = [
          // Tight inner border glow
          `0 0 0 1px hsla(${hue},85%,65%,0.35)`,
          // Mid aura
          `0 0 20px 5px hsla(${hue},90%,60%,0.50)`,
          // Wide outer bleed — two-tone so it looks dimensional
          `0 0 55px 18px hsla(${hue2},85%,55%,0.35)`,
          `0 0 90px 30px hsla(${hue3},80%,50%,0.18)`,
          // Depth shadow so card still lifts off the page
          `0 24px 48px rgba(0,0,0,0.55)`,
        ].join(", ");

        // Subtle inner bright spot at cursor — keeps it feeling interactive
        if (glare) {
          glare.style.opacity      = "1";
          glare.style.mixBlendMode = "";
          glare.style.background   =
            `radial-gradient(circle 55% at ${Math.round(x * 100)}% ${Math.round(y * 100)}%,` +
            `rgba(255,255,255,0.14) 0%, transparent 70%)`;
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
    if (!card) return;
    card.style.transform    = "rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    card.style.boxShadow    = "";
    if (glare) {
      glare.style.opacity      = "0";
      glare.style.background   = "";
      glare.style.mixBlendMode = "";
    }
  }, []);

  return { wrapRef, cardRef, glareRef, onMove, onLeave };
}
