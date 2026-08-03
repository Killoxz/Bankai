"use client";

import { useEffect, useRef } from "react";
import { useAuthStore }       from "@/store/auth-store";
import { useLanguageStore }   from "@/store/language-store";
import { usePlayerPrefsStore } from "@/store/player-prefs-store";
import { useSettingsStore }   from "@/store/settings-store";

/**
 * Invisible component mounted once at the root.
 * Syncs ALL user preferences (language, player, appearance, media, etc.)
 * to and from the database so settings follow the user across devices.
 *
 * - On login: pulls the remote settings blob and applies it to every store.
 * - On any preference change (3 s debounce): pushes the full blob to the API.
 * - Logged-out users keep their preferences only in localStorage.
 */
export function SettingsSync() {
  const currentUser = useAuthStore((s) => s.currentUser);

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

  const loaded    = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUser  = useRef<string | null>(null);

  /* ── Load from DB on login ───────────────────────────────────────── */
  useEffect(() => {
    if (!currentUser) {
      loaded.current   = false;
      prevUser.current = null;
      return;
    }
    if (loaded.current && currentUser === prevUser.current) return;
    loaded.current   = true;
    prevUser.current = currentUser;

    fetch(`/api/settings?username=${encodeURIComponent(currentUser)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const s = data?.settings;
        if (!s || typeof s !== "object") return;

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

        /* Settings store — bulk apply in a single setState */
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
      })
      .catch(() => {});
  }, [currentUser, setTitleLanguage, setDefaultAudio]);

  /* ── Push to DB on any change (3 s debounce) ────────────────────── */
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
            /* language */
            titleLanguage,
            defaultAudio,
            /* player */
            captionsOn,
            captionSize,
            captionColor,
            captionBg,
            captionFont,
            speed,
            /* settings store */
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
    currentUser,
    /* language */
    titleLanguage, defaultAudio,
    /* player */
    captionsOn, captionSize, captionColor, captionBg, captionFont, speed,
    /* settings store */
    showWatchHistory, cardLayout, cardSize, episodeLayout, defaultProvider,
    autoPlay, autoSkipIntroOutro, autoNextEpisode, showComments,
    notifNewEp, notifTrending,
  ]);

  return null;
}
