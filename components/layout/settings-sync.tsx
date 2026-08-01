"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useLanguageStore } from "@/store/language-store";
import { usePlayerPrefsStore } from "@/store/player-prefs-store";

/**
 * Invisible component that syncs all user preferences to/from the database.
 * Mount this once near the root so it runs for every page.
 *
 * - On login: pulls the saved settings blob and applies it to both Zustand stores.
 * - On any preference change: debounces 3 s then pushes the current state to the API.
 *
 * Logged-out users keep their preferences in localStorage only.
 */
export function SettingsSync() {
  const currentUser = useAuthStore((s) => s.currentUser);

  // Language store
  const titleLanguage    = useLanguageStore((s) => s.titleLanguage);
  const defaultAudio     = useLanguageStore((s) => s.defaultAudio);
  const setTitleLanguage = useLanguageStore((s) => s.setTitleLanguage);
  const setDefaultAudio  = useLanguageStore((s) => s.setDefaultAudio);

  // Player prefs store
  const captionsOn    = usePlayerPrefsStore((s) => s.captionsOn);
  const captionSize   = usePlayerPrefsStore((s) => s.captionSize);
  const captionColor  = usePlayerPrefsStore((s) => s.captionColor);
  const captionBg     = usePlayerPrefsStore((s) => s.captionBg);
  const captionFont   = usePlayerPrefsStore((s) => s.captionFont);
  const speed         = usePlayerPrefsStore((s) => s.speed);

  const loaded     = useRef(false);
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUser   = useRef<string | null>(null);

  // Load settings from DB when user changes (login)
  useEffect(() => {
    if (!currentUser) {
      loaded.current = false;
      prevUser.current = null;
      return;
    }
    if (loaded.current && currentUser === prevUser.current) return;
    loaded.current  = true;
    prevUser.current = currentUser;

    fetch(`/api/settings?username=${encodeURIComponent(currentUser)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const s = data?.settings;
        if (!s || typeof s !== "object") return;

        // Apply language/audio prefs
        if (s.titleLanguage) setTitleLanguage(s.titleLanguage as Parameters<typeof setTitleLanguage>[0]);
        if (s.defaultAudio)  setDefaultAudio(s.defaultAudio as "sub" | "dub");

        // Apply player prefs via individual setters (avoids Zustand v5 type friction)
        const st = usePlayerPrefsStore.getState();
        if (typeof s.captionsOn   === "boolean") st.setCaptionsOn(s.captionsOn);
        if (typeof s.captionSize  === "string")  st.setCaptionSize(s.captionSize);
        if (typeof s.captionColor === "string")  st.setCaptionColor(s.captionColor);
        if (typeof s.captionBg    === "string")  st.setCaptionBg(s.captionBg);
        if (typeof s.captionFont  === "string")  st.setCaptionFont(s.captionFont);
        if (typeof s.speed        === "number")  st.setSpeed(s.speed);
      })
      .catch(() => {});
  }, [currentUser, setTitleLanguage, setDefaultAudio]);

  // Push settings to DB whenever any preference changes (3 s debounce)
  useEffect(() => {
    if (!currentUser) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser,
          settings: {
            titleLanguage,
            defaultAudio,
            captionsOn,
            captionSize,
            captionColor,
            captionBg,
            captionFont,
            speed,
          },
        }),
      }).catch(() => {});
    }, 3000);

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [currentUser, titleLanguage, defaultAudio, captionsOn, captionSize, captionColor, captionBg, captionFont, speed]);

  return null;
}
