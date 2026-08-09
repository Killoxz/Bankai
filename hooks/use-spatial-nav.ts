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
 *
 * Key bindings:
 *   ArrowLeft/Right/Up/Down — spatial navigation (skipped if another handler
 *                             already consumed the event via e.preventDefault())
 *   Enter / Space           — click the focused element (for custom focusable divs)
 *   Escape                  — navigate back in browser history
 */
export function useSpatialNav(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      // If another handler (e.g. the video player) already consumed this event,
      // don't also move focus — that would fight with the player's seek controls.
      if (e.defaultPrevented) return;

      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName ?? "";

      // ── Escape → browser back ───────────────────────────────────────────
      if (e.key === "Escape") {
        history.back();
        e.preventDefault();
        return;
      }

      // ── Enter / Space → trigger click on custom focusable elements ──────
      if (e.key === "Enter" || e.key === " ") {
        // Native buttons/links handle Enter/Space themselves; only step in for
        // custom elements (divs with data-tv-focusable, tabindex, etc.)
        if (
          active &&
          tag !== "BUTTON" &&
          tag !== "A" &&
          tag !== "INPUT" &&
          tag !== "SELECT" &&
          tag !== "TEXTAREA"
        ) {
          active.click();
          e.preventDefault();
        }
        return;
      }

      // ── Arrow keys → spatial navigation ─────────────────────────────────
      const dir =
        e.key === "ArrowRight" ? "right" :
        e.key === "ArrowLeft"  ? "left"  :
        e.key === "ArrowDown"  ? "down"  :
        e.key === "ArrowUp"    ? "up"    :
        null;

      if (!dir) return;

      // Don't hijack arrow keys inside text inputs
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (!active || active === document.body) {
        // Focus first visible focusable element
        const first = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE))
          .find(isVisible);
        if (first) {
          first.focus();
          first.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        e.preventDefault();
        return;
      }

      const candidates = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE));
      const target = findBest(active, candidates, dir);
      if (target) {
        (target as HTMLElement).focus();
        target.scrollIntoView({ block: "nearest", behavior: "smooth" });
        e.preventDefault();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
