"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme }                     from "next-themes";
import { useAuthStore }                 from "@/store/auth-store";
import { useLanguageStore }             from "@/store/language-store";
import { usePlayerPrefsStore }          from "@/store/player-prefs-store";
import { useSettingsStore }             from "@/store/settings-store";

const VALID_THEMES = new Set(["dark", "light", "anilist"]);

function applyTheme(value: string, setTheme: (t: string) => void) {
  document.documentElement.classList.add("theme-transition");
  setTheme(value);
  setTimeout(() => document.documentElement.classList.remove("theme-transition"), 350);
}

/**
 * Invisible component mounted once at the root.
 * Syncs ALL user preferences (language, player, appearance, media, etc.)
 * to and from the database so settings follow the user across devices.
 *
 * - On login: pulls the remote settings blob and applies it to every store.
 * - On any preference change (3 s debounce): pushes the full blob to the API.
 * - Theme changes are pushed with a faster 500 ms debounce and polled every
 *   5 s so theme switches propagate to other signed-in devices in near-realtime.
 * - Logged-out users keep their preferences only in localStorage.
 */
export function SettingsSync() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { theme, setTheme } = useTheme();

  /* ── Language store ──────────────────────────────────────────────── */
  const titleLanguage    = useLanguageStore((s) => s.titleLanguage);
  const defaultAudio     = useLanguageStore((s) => s.defaultAudio);
  const setTitleLanguage = useLanguageStore((s) => s.setTitleLanguage);
  const setDefaultAudio  = useLanguageStore((s) => s.setDefaultAudio);

  /* ── Player prefs store ──────────────────────────────────────────── */
  const captionsOn   = usePlayerPrefsStore((s) => s.captionsOn);
  const captionSize  = usePlayerPrefsStore((s) => s.captionSize);
  const captionColor = usePlayerPrefsStore((s) => s.captionColor);
  const captionBg    = usePlayerPrefsStore((s) => s.captionBg);
  const captionFont  = usePlayerPrefsStore((s) => s.captionFont);
  const speed        = usePlayerPrefsStore((s) => s.speed);

  /* ── Settings store ──────────────────────────────────────────────── */
  const showWatchHistory   = useSettingsStore((s) => s.showWatchHistory);
  const cardLayout         = useSettingsStore((s) => s.cardLayout);
  const cardSize           = useSettingsStore((s) => s.cardSize);
  const episodeLayout      = useSettingsStore((s) => s.episodeLayout);
  const defaultProvider    = useSettingsStore((s) => s.defaultProvider);
  const autoPlay           = useSettingsStore((s) => s.autoPlay);
  const autoSkipIntroOutro = useSettingsStore((s) => s.autoSkipIntroOutro);
  const autoNextEpisode    = useSettingsStore((s) => s.autoNextEpisode);
  const showComments       = useSettingsStore((s) => s.showComments);
  const notifNewEp         = useSettingsStore((s) => s.notifNewEp);
  const notifTrending      = useSettingsStore((s) => s.notifTrending);

  const loaded          = useRef(false);
  const saveTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const themeSaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUser        = useRef<string | null>(null);

  // Becomes true after the first DB load completes — prevents pre-load saves
  // from overwriting the server's authoritative theme value.
  const [synced, setSynced] = useState(false);

  /* ── Load from DB on login ───────────────────────────────────────── */
  useEffect(() => {
    if (!currentUser) {
      loaded.current   = false;
      prevUser.current = null;
      setSynced(false);
      return;
    }
    if (loaded.current && currentUser === prevUser.current) return;
    loaded.current   = true;
    prevUser.current = currentUser;

    fetch(`/api/settings?username=${encodeURIComponent(currentUser)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const s = data?.settings;
        if (!s || typeof s !== "object") { setSynced(true); return; }

        /* Theme — applied with smooth transition */
        if (typeof s.theme === "string" && VALID_THEMES.has(s.theme)) {
          applyTheme(s.theme, setTheme);
        }

        /* Language */
        if (s.titleLanguage) setTitleLanguage(s.titleLanguage as Parameters<typeof setTitleLanguage>[0]);
        if (s.defaultAudio)  setDefaultAudio(s.defaultAudio as "sub" | "dub");

        /* Player prefs */
        const pp = usePlayerPrefsStore.getState();
        if (typeof s.captionsOn   === "boolean") pp.setCaptionsOn(s.captionsOn);
        if (typeof s.captionSize  === "string")  pp.setCaptionSize(s.captionSize);
        if (typeof s.captionColor === "string")  pp.setCaptionColor(s.captionColor);
        if (typeof s.captionBg    === "string")  pp.setCaptionBg(s.captionBg);
        if (typeof s.captionFont  === "string")  pp.setCaptionFont(s.captionFont);
        if (typeof s.speed        === "number")  pp.setSpeed(s.speed);

        /* Settings store — bulk apply */
        const updates: Parameters<ReturnType<typeof useSettingsStore.getState>["_applyRemote"]>[0] = {};
        if (typeof s.showWatchHistory   === "boolean") updates.showWatchHistory   = s.showWatchHistory;
        if (s.cardLayout   === "default" || s.cardLayout   === "anichart" || s.cardLayout   === "row")    updates.cardLayout   = s.cardLayout;
        if (s.cardSize     === "small"   || s.cardSize     === "medium"   || s.cardSize     === "large")   updates.cardSize     = s.cardSize;
        if (s.episodeLayout === "list"   || s.episodeLayout === "grid"    || s.episodeLayout === "image")  updates.episodeLayout = s.episodeLayout;
        if (typeof s.defaultProvider    === "string")  updates.defaultProvider    = s.defaultProvider;
        if (typeof s.autoPlay           === "boolean") updates.autoPlay           = s.autoPlay;
        if (typeof s.autoSkipIntroOutro === "boolean") updates.autoSkipIntroOutro = s.autoSkipIntroOutro;
        if (typeof s.autoNextEpisode    === "boolean") updates.autoNextEpisode    = s.autoNextEpisode;
        if (typeof s.showComments       === "boolean") updates.showComments       = s.showComments;
        if (typeof s.notifNewEp         === "boolean") updates.notifNewEp         = s.notifNewEp;
        if (typeof s.notifTrending      === "boolean") updates.notifTrending      = s.notifTrending;
        if (Object.keys(updates).length > 0) {
          useSettingsStore.getState()._applyRemote(updates);
        }

        setSynced(true);
      })
      .catch(() => { setSynced(true); });
  }, [currentUser, setTitleLanguage, setDefaultAudio, setTheme]);

  /* ── Fast theme save: 500ms debounce (for cross-device speed) ────── */
  useEffect(() => {
    if (!currentUser || !synced || !theme) return;
    if (themeSaveTimer.current) clearTimeout(themeSaveTimer.current);
    themeSaveTimer.current = setTimeout(() => {
      // Use getState() so we never capture stale closure values
      const lang = useLanguageStore.getState();
      const pp   = usePlayerPrefsStore.getState();
      const st   = useSettingsStore.getState();
      fetch("/api/settings", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser,
          settings: {
            theme,
            titleLanguage:      lang.titleLanguage,
            defaultAudio:       lang.defaultAudio,
            captionsOn:         pp.captionsOn,
            captionSize:        pp.captionSize,
            captionColor:       pp.captionColor,
            captionBg:          pp.captionBg,
            captionFont:        pp.captionFont,
            speed:              pp.speed,
            showWatchHistory:   st.showWatchHistory,
            cardLayout:         st.cardLayout,
            cardSize:           st.cardSize,
            episodeLayout:      st.episodeLayout,
            defaultProvider:    st.defaultProvider,
            autoPlay:           st.autoPlay,
            autoSkipIntroOutro: st.autoSkipIntroOutro,
            autoNextEpisode:    st.autoNextEpisode,
            showComments:       st.showComments,
            notifNewEp:         st.notifNewEp,
            notifTrending:      st.notifTrending,
          },
        }),
      }).catch(() => {});
    }, 500);
    return () => { if (themeSaveTimer.current) clearTimeout(themeSaveTimer.current); };
  }, [theme, currentUser, synced]);

  /* ── Push all settings to DB on any change (3s debounce) ────────── */
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
            theme,
            titleLanguage,
            defaultAudio,
            captionsOn,
            captionSize,
            captionColor,
            captionBg,
            captionFont,
            speed,
            showWatchHistory,
            cardLayout,
            cardSize,
            episodeLayout,
            defaultProvider,
            autoPlay,
            autoSkipIntroOutro,
            autoNextEpisode,
            showComments,
            notifNewEp,
            notifTrending,
          },
        }),
      }).catch(() => {});
    }, 3000);

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [
    currentUser, theme,
    titleLanguage, defaultAudio,
    captionsOn, captionSize, captionColor, captionBg, captionFont, speed,
    showWatchHistory, cardLayout, cardSize, episodeLayout, defaultProvider,
    autoPlay, autoSkipIntroOutro, autoNextEpisode, showComments,
    notifNewEp, notifTrending,
  ]);

  /* ── Poll every 5s for theme changes made on other devices ──────── */
  useEffect(() => {
    if (!currentUser || !synced) return;
    const poll = setInterval(async () => {
      try {
        const r    = await fetch(`/api/settings?username=${encodeURIComponent(currentUser)}`);
        if (!r.ok) return;
        const data = await r.json();
        const remote = data?.settings?.theme;
        if (remote && VALID_THEMES.has(remote) && remote !== theme) {
          applyTheme(remote, setTheme);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(poll);
  }, [currentUser, synced, theme, setTheme]);

  return null;
}
