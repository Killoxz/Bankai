"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme }                     from "next-themes";
import { useAuthStore }                 from "@/store/auth-store";
import { useLanguageStore, type TitleLanguage, type DefaultAudio } from "@/store/language-store";
import { usePlayerPrefsStore }          from "@/store/player-prefs-store";
import { useSettingsStore }             from "@/store/settings-store";
import { useCardAnimationStore, type CardAnimation } from "@/store/card-animation-store";

const VALID_THEMES          = new Set(["dark", "light", "anilist"]);
const VALID_CARD_ANIMATIONS = new Set(["tilt", "hover", "float"]);

function withThemeTransition(fn: () => void) {
  document.documentElement.classList.add("theme-transition");
  fn();
  setTimeout(() => document.documentElement.classList.remove("theme-transition"), 350);
}

/**
 * Invisible component mounted once at the root.
 *
 * Sync strategy:
 *  1. On login  — pull DB blob, apply every setting with smooth transitions.
 *  2. On change — 150 ms micro-debounce, then:
 *       a. BroadcastChannel → zero-latency same-browser cross-tab apply.
 *       b. PUT /api/settings → persists to DB for cross-device sync.
 *  3. Poll      — every 2 s compare DB `updatedAt`; apply if changed.
 *                 `applyingRemote` flag prevents echo-saves back to DB.
 *
 * Every setting across all stores (theme, cardAnimation, language, player,
 * appearance, media, notifications) is covered.
 */
export function SettingsSync() {
  const currentUser  = useAuthStore((s) => s.currentUser);
  const { theme, setTheme } = useTheme();

  /* ── Language ──────────────────────────────────────────────────── */
  const titleLanguage    = useLanguageStore((s) => s.titleLanguage);
  const defaultAudio     = useLanguageStore((s) => s.defaultAudio);
  const setTitleLanguage = useLanguageStore((s) => s.setTitleLanguage);
  const setDefaultAudio  = useLanguageStore((s) => s.setDefaultAudio);

  /* ── Player prefs ──────────────────────────────────────────────── */
  const captionsOn   = usePlayerPrefsStore((s) => s.captionsOn);
  const captionSize  = usePlayerPrefsStore((s) => s.captionSize);
  const captionColor = usePlayerPrefsStore((s) => s.captionColor);
  const captionBg    = usePlayerPrefsStore((s) => s.captionBg);
  const captionFont  = usePlayerPrefsStore((s) => s.captionFont);
  const speed        = usePlayerPrefsStore((s) => s.speed);

  /* ── Appearance / media settings ──────────────────────────────── */
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

  /* ── Card animation ────────────────────────────────────────────── */
  const cardAnimation    = useCardAnimationStore((s) => s.cardAnimation);
  const setCardAnimation = useCardAnimationStore((s) => s.setCardAnimation);

  const [synced, setSynced]  = useState(false);
  const loaded               = useRef(false);
  const prevUser             = useRef<string | null>(null);
  const saveTimer            = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyingRemote       = useRef(false);
  const lastUpdatedAt        = useRef<string | null>(null);
  const bcRef                = useRef<BroadcastChannel | null>(null);

  /* ── applyBlobRef ──────────────────────────────────────────────────
   * Re-assigned every render so BC and poll callbacks always close over
   * the freshest comparator values (theme, cardAnimation, etc.).
   * Only calls store setters when a value actually differs — prevents
   * unnecessary re-renders and breaks any potential update loop.
   * ---------------------------------------------------------------- */
  const applyBlobRef = useRef<(raw: Record<string, unknown>) => void>(() => {});
  applyBlobRef.current = (raw) => {
    const lang = useLanguageStore.getState();
    const pp   = usePlayerPrefsStore.getState();
    const st   = useSettingsStore.getState();
    const ca   = useCardAnimationStore.getState();

    applyingRemote.current = true;

    /* Theme */
    if (typeof raw.theme === "string" && VALID_THEMES.has(raw.theme) && raw.theme !== theme) {
      withThemeTransition(() => setTheme(raw.theme as string));
    }

    /* Card animation */
    if (
      typeof raw.cardAnimation === "string" &&
      VALID_CARD_ANIMATIONS.has(raw.cardAnimation) &&
      raw.cardAnimation !== ca.cardAnimation
    ) {
      ca.setCardAnimation(raw.cardAnimation as CardAnimation);
    }

    /* Language */
    if (typeof raw.titleLanguage === "string" && raw.titleLanguage !== lang.titleLanguage) {
      lang.setTitleLanguage(raw.titleLanguage as TitleLanguage);
    }
    if (typeof raw.defaultAudio === "string" && raw.defaultAudio !== lang.defaultAudio) {
      lang.setDefaultAudio(raw.defaultAudio as DefaultAudio);
    }

    /* Player prefs */
    if (typeof raw.captionsOn   === "boolean" && raw.captionsOn   !== pp.captionsOn)   pp.setCaptionsOn(raw.captionsOn);
    if (typeof raw.captionSize  === "string"  && raw.captionSize  !== pp.captionSize)  pp.setCaptionSize(raw.captionSize);
    if (typeof raw.captionColor === "string"  && raw.captionColor !== pp.captionColor) pp.setCaptionColor(raw.captionColor);
    if (typeof raw.captionBg    === "string"  && raw.captionBg    !== pp.captionBg)    pp.setCaptionBg(raw.captionBg);
    if (typeof raw.captionFont  === "string"  && raw.captionFont  !== pp.captionFont)  pp.setCaptionFont(raw.captionFont);
    if (typeof raw.speed        === "number"  && raw.speed        !== pp.speed)        pp.setSpeed(raw.speed);

    /* Settings store — bulk apply in one setState */
    const updates: Parameters<typeof st._applyRemote>[0] = {};
    if (typeof raw.showWatchHistory   === "boolean" && raw.showWatchHistory   !== st.showWatchHistory)   updates.showWatchHistory   = raw.showWatchHistory;
    if ((raw.cardLayout   === "default" || raw.cardLayout   === "anichart" || raw.cardLayout   === "row")   && raw.cardLayout   !== st.cardLayout)   updates.cardLayout   = raw.cardLayout;
    if ((raw.cardSize     === "small"   || raw.cardSize     === "medium"   || raw.cardSize     === "large")  && raw.cardSize     !== st.cardSize)     updates.cardSize     = raw.cardSize;
    if ((raw.episodeLayout === "list"   || raw.episodeLayout === "grid"    || raw.episodeLayout === "image") && raw.episodeLayout !== st.episodeLayout) updates.episodeLayout = raw.episodeLayout;
    if (typeof raw.defaultProvider    === "string"  && raw.defaultProvider    !== st.defaultProvider)    updates.defaultProvider    = raw.defaultProvider;
    if (typeof raw.autoPlay           === "boolean" && raw.autoPlay           !== st.autoPlay)           updates.autoPlay           = raw.autoPlay;
    if (typeof raw.autoSkipIntroOutro === "boolean" && raw.autoSkipIntroOutro !== st.autoSkipIntroOutro) updates.autoSkipIntroOutro = raw.autoSkipIntroOutro;
    if (typeof raw.autoNextEpisode    === "boolean" && raw.autoNextEpisode    !== st.autoNextEpisode)    updates.autoNextEpisode    = raw.autoNextEpisode;
    if (typeof raw.showComments       === "boolean" && raw.showComments       !== st.showComments)       updates.showComments       = raw.showComments;
    if (typeof raw.notifNewEp         === "boolean" && raw.notifNewEp         !== st.notifNewEp)         updates.notifNewEp         = raw.notifNewEp;
    if (typeof raw.notifTrending      === "boolean" && raw.notifTrending      !== st.notifTrending)      updates.notifTrending      = raw.notifTrending;
    if (Object.keys(updates).length > 0) st._applyRemote(updates);

    // Reset after React has committed updates and effects have run
    setTimeout(() => { applyingRemote.current = false; }, 0);
  };

  /* ── BroadcastChannel: zero-latency same-browser tab sync ──────── */
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel("bankai-settings");
    bc.onmessage = (e: MessageEvent) => {
      if (e.data?.settings) applyBlobRef.current(e.data.settings as Record<string, unknown>);
    };
    bcRef.current = bc;
    return () => { bc.close(); bcRef.current = null; };
  }, []);

  /* ── Load from DB on login ──────────────────────────────────────── */
  useEffect(() => {
    if (!currentUser) {
      loaded.current        = false;
      prevUser.current      = null;
      lastUpdatedAt.current = null;
      setSynced(false);
      return;
    }
    if (loaded.current && currentUser === prevUser.current) return;
    loaded.current   = true;
    prevUser.current = currentUser;

    fetch(`/api/settings?username=${encodeURIComponent(currentUser)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.updatedAt) lastUpdatedAt.current = String(data.updatedAt);
        const s = data?.settings;
        if (s && typeof s === "object") applyBlobRef.current(s as Record<string, unknown>);
        setSynced(true);
      })
      .catch(() => { setSynced(true); });
  }, [currentUser]);

  /* ── Save to DB + broadcast on any setting change ───────────────────
   * 150 ms micro-debounce — fast enough to feel instant, prevents
   * duplicate writes from React's batched state updates.
   * ----------------------------------------------------------------- */
  useEffect(() => {
    if (!currentUser || !synced || applyingRemote.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // Read fresh state inside the timer — avoids stale closure values
      const lang = useLanguageStore.getState();
      const pp   = usePlayerPrefsStore.getState();
      const st   = useSettingsStore.getState();
      const ca   = useCardAnimationStore.getState();
      const blob = {
        theme:              theme ?? "dark",
        cardAnimation:      ca.cardAnimation,
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
      };

      // Instant same-browser sync
      bcRef.current?.postMessage({ settings: blob });

      // Persist for cross-device sync
      fetch("/api/settings", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: currentUser, settings: blob }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data?.updatedAt) lastUpdatedAt.current = String(data.updatedAt); })
        .catch(() => {});
    }, 150);

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [
    currentUser, synced, theme, cardAnimation,
    titleLanguage, defaultAudio,
    captionsOn, captionSize, captionColor, captionBg, captionFont, speed,
    showWatchHistory, cardLayout, cardSize, episodeLayout, defaultProvider,
    autoPlay, autoSkipIntroOutro, autoNextEpisode, showComments,
    notifNewEp, notifTrending,
  ]);

  /* ── Poll every 2 s for cross-device sync ───────────────────────── */
  useEffect(() => {
    if (!currentUser || !synced) return;
    const poll = setInterval(async () => {
      try {
        const r    = await fetch(`/api/settings?username=${encodeURIComponent(currentUser)}`);
        if (!r.ok) return;
        const data = await r.json();
        // Skip if the DB hasn't been updated since we last saw it
        const serverUpdatedAt = data?.updatedAt ? String(data.updatedAt) : null;
        if (serverUpdatedAt && serverUpdatedAt === lastUpdatedAt.current) return;
        lastUpdatedAt.current = serverUpdatedAt;
        const s = data?.settings;
        if (s && typeof s === "object") applyBlobRef.current(s as Record<string, unknown>);
      } catch {}
    }, 2000);
    return () => clearInterval(poll);
  }, [currentUser, synced]);

  return null;
}
