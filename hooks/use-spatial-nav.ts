"use client";

import { useEffect } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[data-tv-focusable]",
].join(", ");

function getRect(el: Element) {
  return el.getBoundingClientRect();
}

function centroid(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function isVisible(el: Element): boolean {
  const rect = getRect(el);
  if (rect.width === 0 || rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
}

function findBest(
  current: Element,
  candidates: Element[],
  dir: "up" | "down" | "left" | "right",
): Element | null {
  const curRect = getRect(current);
  const curC = centroid(curRect);

  let best: Element | null = null;
  let bestScore = Infinity;

  for (const el of candidates) {
    if (el === current) continue;
    if (!isVisible(el)) continue;

    const rect = getRect(el);
    const c = centroid(rect);
    const dx = c.x - curC.x;
    const dy = c.y - curC.y;

    // Filter by direction
    const inDir =
      dir === "right" ? dx > 0 :
      dir === "left"  ? dx < 0 :
      dir === "down"  ? dy > 0 :
      /* up */          dy < 0;
    if (!inDir) continue;

    // Score: primary axis distance + small cross-axis penalty
    const primary  = dir === "left" || dir === "right" ? Math.abs(dx) : Math.abs(dy);
    const cross    = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
    const score    = primary + cross * 0.3;

    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  return best;
}

/**
 * When TV mode is active, intercepts arrow keys to move focus between
 * interactive elements. Must be mounted once (e.g. in the root layout).
 */
export function useSpatialNav(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      const dir =
        e.key === "ArrowRight" ? "right" :
        e.key === "ArrowLeft"  ? "left"  :
        e.key === "ArrowDown"  ? "down"  :
        e.key === "ArrowUp"    ? "up"    :
        null;

      if (!dir) return;

      const active = document.activeElement;
      if (!active || active === document.body) {
        // Focus first visible focusable element
        const first = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE))
          .find(isVisible);
        first?.focus();
        e.preventDefault();
        return;
      }

      // Don't hijack arrow keys inside inputs/textareas
      const tag = (active as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const candidates = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE));
      const target = findBest(active, candidates, dir);
      if (target) {
        (target as HTMLElement).focus();
        e.preventDefault();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
