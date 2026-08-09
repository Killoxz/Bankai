"use client";

import { useEffect, useState } from "react";

const TV_UA_PATTERNS = [
  /SmartTV/i, /SMART-TV/i, /HbbTV/i, /WebOS/i, /Tizen/i,
  /CrKey/i, /AFTS/i, /Roku/i, /PlayStation/i, /Xbox/i,
  /AppleTV/i, /googletv/i, /Android TV/i, /OPR\/.*TV/i,
  /BRAVIA/i, /SHIELD/i, /Vizio/i, /NetCast/i, /SmartHub/i,
  /PhilipsTV/i, /MiTV/i, /Android.*Box/i, /Foxxum/i,
  /ZEASN/i, /Vewd/i, /FreeSat/i, /Kylo/i,
  /AmazonWebAppPlatform/i, /TV Safari/i,
];

function detectTvUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return TV_UA_PATTERNS.some((re) => re.test(navigator.userAgent));
}

// Large screen + no touchscreen + coarse pointer (remote) = very likely a TV
function detectTvScreen(): boolean {
  if (typeof window === "undefined") return false;
  const noTouch   = navigator.maxTouchPoints === 0;
  const bigScreen = window.screen.width >= 1280 && window.screen.height >= 720;
  const landscape = window.screen.width > window.screen.height;
  const coarse    = window.matchMedia("(pointer: coarse)").matches &&
                    !window.matchMedia("(hover: hover)").matches;
  return noTouch && bigScreen && landscape && coarse;
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

function getPromptDismissed(): boolean {
  try { return sessionStorage.getItem("bankai-tv-prompt-dismissed") === "1"; } catch { return false; }
}

export function setPromptDismissed() {
  try { sessionStorage.setItem("bankai-tv-prompt-dismissed", "1"); } catch {}
}

export function useTvMode(): {
  isTvMode: boolean;
  isTvDevice: boolean;
  toggle: () => void;
  showPrompt: boolean;
  dismissPrompt: () => void;
} {
  const [isTvMode,   setIsTvMode]   = useState(false);
  const [isTvDevice, setIsTvDevice] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detect TV device regardless of mode state — drives UI visibility
    const isTV = detectTvUserAgent() || detectTvScreen();
    setIsTvDevice(isTV);

    // URL param overrides everything — ?tv=1 or ?tv=0
    const params = new URLSearchParams(window.location.search);
    if (params.has("tv")) {
      const enabled = params.get("tv") !== "0";
      setStoredTvMode(enabled);
      setIsTvMode(enabled);
      return;
    }

    // Stored user preference
    const stored = getStoredTvMode();
    if (stored !== null) {
      setIsTvMode(stored);
      return;
    }

    // Auto-enable on detected TV
    if (isTV) {
      setIsTvMode(true);
      setStoredTvMode(true);
      return;
    }

    // No TV signal — show prompt on first D-pad arrow press
    if (getPromptDismissed()) return;
    const onFirstDpad = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        setShowPrompt(true);
        window.removeEventListener("keydown", onFirstDpad);
      }
    };
    window.addEventListener("keydown", onFirstDpad);
    return () => window.removeEventListener("keydown", onFirstDpad);
  }, []);

  // Sync class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle("tv-mode", isTvMode);
  }, [isTvMode]);

  const toggle = () => {
    setIsTvMode((prev) => {
      const next = !prev;
      setStoredTvMode(next);
      return next;
    });
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    setPromptDismissed();
  };

  return { isTvMode, isTvDevice, toggle, showPrompt, dismissPrompt };
}
