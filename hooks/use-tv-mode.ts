"use client";

import { useEffect, useState } from "react";

const TV_UA_PATTERNS = [
  /SmartTV/i, /SMART-TV/i, /HbbTV/i, /WebOS/i, /Tizen/i,
  /CrKey/i, /AFTS/i, /Roku/i, /PlayStation/i, /Xbox/i,
  /AppleTV/i, /googletv/i, /Android TV/i, /OPR\/.*TV/i,
];

function detectTvUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return TV_UA_PATTERNS.some((re) => re.test(navigator.userAgent));
}

function getStoredTvMode(): boolean | null {
  try {
    const val = localStorage.getItem("bankai-tv-mode");
    if (val === "1") return true;
    if (val === "0") return false;
  } catch {}
  return null;
}

export function setStoredTvMode(enabled: boolean) {
  try { localStorage.setItem("bankai-tv-mode", enabled ? "1" : "0"); } catch {}
}

/**
 * Returns whether TV mode is currently active.
 * TV mode can be triggered by:
 *  - A TV user-agent
 *  - localStorage flag (bankai-tv-mode=1)
 *  - URL param ?tv=1 (sets the flag) / ?tv=0 (clears it)
 */
export function useTvMode(): { isTvMode: boolean; toggle: () => void } {
  const [isTvMode, setIsTvMode] = useState(false);

  useEffect(() => {
    // Check URL param first — lets users force-enable/disable
    const params = new URLSearchParams(window.location.search);
    if (params.has("tv")) {
      const enabled = params.get("tv") !== "0";
      setStoredTvMode(enabled);
      setIsTvMode(enabled);
      return;
    }

    // Then stored preference
    const stored = getStoredTvMode();
    if (stored !== null) {
      setIsTvMode(stored);
      return;
    }

    // Finally UA detection
    if (detectTvUserAgent()) {
      setIsTvMode(true);
    }
  }, []);

  // Apply/remove class on <html>
  useEffect(() => {
    const html = document.documentElement;
    if (isTvMode) {
      html.classList.add("tv-mode");
    } else {
      html.classList.remove("tv-mode");
    }
  }, [isTvMode]);

  const toggle = () => {
    setIsTvMode((prev) => {
      const next = !prev;
      setStoredTvMode(next);
      return next;
    });
  };

  return { isTvMode, toggle };
}
