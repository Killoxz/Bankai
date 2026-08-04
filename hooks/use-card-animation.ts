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
        // Holographic prism: 3D tilt + shifting rainbow spectrum + specular highlight
        const wrap = wrapRef.current;
        if (!wrap) return;
        const { left, top, width, height } = wrap.getBoundingClientRect();
        const x = (e.clientX - left) / width;
        const y = (e.clientY - top) / height;

        // 3D tilt (same feel as tilt mode)
        const rY = (x - 0.5) * TILT_Y * 1.6;
        const rX = -(y - 0.5) * TILT_X * 1.6;
        card.style.transform = `rotateX(${rX}deg) rotateY(${rY}deg) scale3d(1.07,1.07,1.07)`;
        card.style.boxShadow = `${-rY * 1.5}px ${rX * 1.5}px 48px rgba(0,0,0,0.6)`;

        if (glare) {
          // Hue shifts across the full spectrum as you move the mouse
          const hue   = Math.round((x * 0.65 + y * 0.35) * 360);
          // Stripe angle tilts slightly with horizontal mouse position
          const angle = 112 + (x - 0.5) * 45;

          glare.style.opacity    = "1";
          glare.style.mixBlendMode = "screen";
          glare.style.background = [
            // Full-spectrum rainbow stripes
            `linear-gradient(${angle}deg,` +
              `hsla(${(hue      ) % 360},100%,62%,0.55) 0%,` +
              `hsla(${(hue +  55) % 360},100%,68%,0.50) 17%,` +
              `hsla(${(hue + 110) % 360},100%,62%,0.55) 33%,` +
              `hsla(${(hue + 165) % 360},100%,68%,0.50) 50%,` +
              `hsla(${(hue + 220) % 360},100%,62%,0.55) 66%,` +
              `hsla(${(hue + 280) % 360},100%,68%,0.50) 83%,` +
              `hsla(${(hue + 335) % 360},100%,62%,0.55) 100%)`,
            // Bright specular highlight that follows the cursor
            `radial-gradient(ellipse 48% 52% at ${Math.round(x * 100)}% ${Math.round(y * 100)}%,` +
              `rgba(255,255,255,0.55) 0%,` +
              `rgba(255,255,255,0.18) 38%,` +
              `transparent 72%)`,
          ].join(", ");
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
