"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { useAuthStore } from "@/store/auth-store";
import { usePlayerPrefsStore } from "@/store/player-prefs-store";
import { firstAvailableProvider, providerLabel, type EpisodesMap } from "./episode-utils";

interface Timestamp     { start: number; end: number }
interface SubtitleTrack { file: string; label?: string; kind?: string }
interface HLSLevel      { index: number; height: number; bitrate: number }

interface DownPlayerProps {
  poster?: string;
  animeId: number;
  malId?: number | null;
  animeTitle?: string;
  animeCover?: string;
  episode?: number;
  totalEpisodes?: number;
  currentEpisode?: number;
  providersData: EpisodesMap | null;
  selectedProvider: string | null;
  audio: "sub" | "dub";
  onProviderChange: (p: string | null) => void;
  onAudioChange: (a: "sub" | "dub") => void;
  autoplay: boolean;
  autoNext: boolean;
  autoSkip: boolean;
  lightsOff: boolean;
  onAutoplayChange: (v: boolean) => void;
  onAutoNextChange: (v: boolean) => void;
  onAutoSkipChange: (v: boolean) => void;
  onLightsOffChange: (v: boolean) => void;
  onPrevEpisode: () => void;
  onNextEpisode: () => void;
  onEpisodeEnd?: () => void;
  onError?: (provider: string) => void;
}

/**
 * Normalise a timestamp from any provider/AniSkip format and validate it.
 * Accepts {start,end} and {startTime,endTime} field names.
 * Returns null if the segment is invalid (zero-length, negative, or < 5 s long).
 */
function parseTimestamp(raw: Timestamp | Record<string, number> | null | undefined): Timestamp | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, number>;
  const start = r.start   ?? r.startTime   ?? -1;
  const end   = r.end     ?? r.endTime     ?? -1;
  if (typeof start !== "number" || typeof end !== "number") return null;
  if (start < 0 || end <= start + 5) return null; // at least 5 s long
  return { start, end };
}

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function fmtRemaining(current: number, total: number): string {
  if (!isFinite(total) || total <= 0) return "-0:00";
  return `-${fmt(Math.max(0, total - current))}`;
}

function Toggle({ label, active, accent, onClick }: {
  label: string; active: boolean; accent?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 whitespace-nowrap text-xs font-medium text-white/50 transition-colors hover:text-white/80 [touch-action:manipulation]"
    >
      <span className={[
        "relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors duration-200",
        active && accent ? "bg-primary" : active ? "bg-white/50" : "bg-white/15",
      ].join(" ")}>
        <span className={[
          "absolute size-2.5 rounded-full bg-white shadow transition-transform duration-200",
          active ? "translate-x-[11px]" : "translate-x-[1px]",
        ].join(" ")} />
      </span>
      {label}
    </button>
  );
}

function MI({ name, className, size = 20, filled = true }: {
  name: string; className?: string; size?: number; filled?: boolean;
}) {
  return (
    <span
      className={["material-symbols-rounded select-none", className].filter(Boolean).join(" ")}
      aria-hidden
      style={{
        fontSize: size,
        lineHeight: 1,
        display: "inline-block",
        verticalAlign: "middle",
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
      }}
    >
      {name}
    </span>
  );
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const CAPTION_COLORS = ["#ffffff", "#ffff00", "#00eeff", "#ff6b6b", "#a8ff78"];
const CAPTION_FONTS  = [
  { l: "Default", v: "inherit" },
  { l: "Arial",   v: "Arial, sans-serif" },
  { l: "Serif",   v: "Georgia, serif" },
  { l: "Mono",    v: "monospace" },
];
const CAPTION_BGS = [
  { l: "None", v: "transparent" },
  { l: "Semi", v: "rgba(0,0,0,0.65)" },
  { l: "Dark", v: "rgba(0,0,0,0.9)" },
];

export function DownPlayer({
  poster, animeId, malId, animeTitle, animeCover,
  episode = 1, totalEpisodes = 0,
  providersData, selectedProvider, audio,
  onProviderChange, onAudioChange,
  autoplay, autoNext, autoSkip, lightsOff,
  onAutoplayChange, onAutoNextChange, onAutoSkipChange, onLightsOffChange,
  onPrevEpisode, onNextEpisode, onEpisodeEnd, onError,
}: DownPlayerProps) {
  const videoRef      = useRef<HTMLVideoElement | null>(null);
  const containerRef  = useRef<HTMLDivElement | null>(null);
  const progressRef   = useRef<HTMLDivElement | null>(null);
  const hlsRef        = useRef<Hls | null>(null);
  const hideTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubbingRef  = useRef(false);
  const currentUser   = useAuthStore((s) => s.currentUser);

  // ── Stable refs so initPlayer deps stay minimal ───────────────────────────
  const autoplayRef         = useRef(autoplay);
  const autoSkipRef         = useRef(autoSkip);
  const onErrorRef          = useRef(onError);
  const onEpisodeEndRef     = useRef(onEpisodeEnd);
  const currentUserRef      = useRef(currentUser);
  const providersDataRef    = useRef(providersData);
  const selectedProviderRef = useRef(selectedProvider);
  const audioRef            = useRef(audio);
  const speedRef            = useRef(1);
  const animeTitleRef       = useRef(animeTitle);
  const animeCoverRef       = useRef(animeCover);

  useEffect(() => { autoplayRef.current         = autoplay;         }, [autoplay]);
  useEffect(() => { autoSkipRef.current         = autoSkip;         }, [autoSkip]);
  useEffect(() => { onErrorRef.current          = onError;          }, [onError]);
  useEffect(() => { onEpisodeEndRef.current     = onEpisodeEnd;     }, [onEpisodeEnd]);
  useEffect(() => { currentUserRef.current      = currentUser;      }, [currentUser]);
  useEffect(() => { providersDataRef.current    = providersData;    }, [providersData]);
  useEffect(() => { selectedProviderRef.current = selectedProvider; }, [selectedProvider]);
  useEffect(() => { audioRef.current            = audio;            }, [audio]);
  useEffect(() => { animeTitleRef.current       = animeTitle;       }, [animeTitle]);
  useEffect(() => { animeCoverRef.current       = animeCover;       }, [animeCover]);

  // ── Stream state ──────────────────────────────────────────────────────────
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [intro,    setIntro]    = useState<Timestamp | null>(null);
  const [outro,    setOutro]    = useState<Timestamp | null>(null);
  const [skipZone, setSkipZone] = useState<"intro" | "outro" | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);

  // ── Playback UI state ─────────────────────────────────────────────────────
  const [playing,     setPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [volume,      setVolume]      = useState(1);
  const [muted,       setMuted]       = useState(false);
  const [fullscreen,  setFullscreen]  = useState(false);
  const [showCtrl,    setShowCtrl]    = useState(true);

  // ── Caption & speed state (persisted via Zustand → synced cross-device) ──
  const captionsOn   = usePlayerPrefsStore((s) => s.captionsOn);
  const captionSize  = usePlayerPrefsStore((s) => s.captionSize);
  const captionColor = usePlayerPrefsStore((s) => s.captionColor);
  const captionBg    = usePlayerPrefsStore((s) => s.captionBg);
  const captionFont  = usePlayerPrefsStore((s) => s.captionFont);
  const speed        = usePlayerPrefsStore((s) => s.speed);
  const setCaptionsOn   = usePlayerPrefsStore((s) => s.setCaptionsOn);
  const setCaptionSize  = usePlayerPrefsStore((s) => s.setCaptionSize);
  const setCaptionColor = usePlayerPrefsStore((s) => s.setCaptionColor);
  const setCaptionBg    = usePlayerPrefsStore((s) => s.setCaptionBg);
  const setCaptionFont  = usePlayerPrefsStore((s) => s.setCaptionFont);
  const setSpeed        = usePlayerPrefsStore((s) => s.setSpeed);

  const PLAYER_TYPES = ["plyr", "natv", "vidk"] as const;
  type PlayerType = typeof PLAYER_TYPES[number];
  const [playerType,       setPlayerType]       = useState<PlayerType>("plyr");
  const [selectedTrack,    setSelectedTrack]    = useState(0);
  const [hlsLevels,        setHlsLevels]        = useState<HLSLevel[]>([]);
  const [selectedLevel,    setSelectedLevel]    = useState(-1); // -1 = Auto
  const [captionPanelOpen,  setCaptionPanelOpen]  = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);


  // Ref kept in sync with the Zustand speed value for use inside stable callbacks
  useEffect(() => { speedRef.current = speed; }, [speed]);


  // ── Caption ::cue style injection ─────────────────────────────────────────
  useEffect(() => {
    const styleId = "bankai-cue-styles";
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = styleId;
      document.head.appendChild(el);
    }
    const pct = parseFloat(captionSize) / 100;
    el.textContent = `video::cue { font-size: ${pct}em; color: ${captionColor}; background-color: ${captionBg}; font-family: ${captionFont}; }`;
  }, [captionSize, captionColor, captionBg, captionFont]);

  // ── Caption on/off — only show the selectedTrack index, hide all others ─────
  // "hidden" keeps the track data loaded (instant toggle); "showing" renders cues.
  // We listen to addtrack because the browser may override modes when tracks load,
  // and we add a 100ms timeout as a fallback for streams where tracks register late.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const applyModes = () => {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = captionsOn && i === selectedTrack ? "showing" : "hidden";
      }
    };

    applyModes();
    const timer = setTimeout(applyModes, 100);
    video.textTracks.addEventListener("addtrack", applyModes);

    return () => {
      clearTimeout(timer);
      video.textTracks.removeEventListener("addtrack", applyModes);
    };
  }, [captionsOn, subtitles, selectedTrack]); // subtitles dep re-runs after <track> elements render

  // ── Playback speed ────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
  }, [speed]);

  // ── Player initialisation ─────────────────────────────────────────────────
  const initPlayer = useCallback(async () => {
    if (!selectedProvider) return;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    setEmbedUrl(null);
    setLoading(true);
    setError(null);
    setIntro(null);
    setOutro(null);
    setSkipZone(null);
    setSubtitles([]);
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);
    setSelectedTrack(0);
    setHlsLevels([]);
    setSelectedLevel(-1);

    try {
      const epId = providersDataRef.current?.[selectedProvider]?.episodes?.[audio]
        ?.find((e) => e.number === episode)?.id;

      const apiUrl = epId
        ? `/api/stream?episodeId=${encodeURIComponent(epId)}`
        : `/api/stream?id=${animeId}&ep=${episode}&provider=${encodeURIComponent(selectedProvider)}&audio=${audio}`;

      // Local progress stored in sessionStorage as an instant, auth-independent fallback.
      const ssKey = `bankai-progress-${animeId}-${episode}`;
      const localProgress = (() => {
        try { return parseInt(sessionStorage.getItem(ssKey) ?? "0", 10) || 0; } catch { return 0; }
      })();

      const [res, apiProgress] = await Promise.all([
        fetch(apiUrl),
        currentUserRef.current
          ? fetch(`/api/history?username=${encodeURIComponent(currentUserRef.current)}`)
              .then((r) => r.ok ? r.json() : { history: [] })
              .then((json) => {
                const entry = (json?.history ?? []).find(
                  (e: { animeId: string; episodeNumber: number; progress: number; completed: boolean }) =>
                    e.animeId === `anilist:${animeId}` && e.episodeNumber === episode && !e.completed
                );
                return (entry?.progress ?? 0) > 30 ? (entry.progress as number) : 0;
              })
              .catch(() => 0)
          : Promise.resolve(0),
      ]);

      // Prefer whichever position is further along
      const resumeAt = Math.max(localProgress, apiProgress);

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = await res.json() as {
        stream_url?: string | null;
        subtitles?:  SubtitleTrack[];
        intro?:      Timestamp;
        outro?:      Timestamp;
        error?:      string;
      };
      if (data.error) throw new Error(data.error);

      const streamUrl = data.stream_url;
      if (!streamUrl) throw new Error("No stream URL — try another source.");

      // Megaplay embed — hand off to an iframe player, no HLS needed.
      if (/^https?:\/\/megaplay\.buzz/i.test(streamUrl)) {
        setEmbedUrl(streamUrl);
        setLoading(false);
        if (currentUserRef.current) {
          fetch("/api/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username:      currentUserRef.current,
              animeId:       `anilist:${animeId}`,
              episodeNumber: episode,
              progress:      0,
              duration:      0,
              completed:     false,
              animeTitle:    animeTitleRef.current,
              animeCover:    animeCoverRef.current,
            }),
          }).catch(() => {});
        }
        return;
      }

      // ── HLS path ─────────────────────────────────────────────────────────────
      const video = videoRef.current;
      if (!video) return;

      // Use provider timestamps immediately — they're already available.
      // AniSkip fires async below and will override these if it has better data.
      const providerIntro = parseTimestamp(data.intro);
      const providerOutro = parseTimestamp(data.outro);
      if (providerIntro) setIntro(providerIntro);
      if (providerOutro) setOutro(providerOutro);

      // AniSkip: community-verified, provider-independent skip times.
      // Non-blocking — fires after the stream is set up so it never delays playback.
      // Overrides provider timestamps when it arrives (AniSkip is more accurate).
      if (malId != null && malId > 0) {
        fetch(`/api/skip-times?malId=${malId}&ep=${episode}`, {
          signal: AbortSignal.timeout(8000),
        })
          .then((r) => r.ok ? r.json() : null)
          .catch(() => null)
          .then((skipTimes: { intro?: Timestamp; outro?: Timestamp } | null) => {
            const aniIntro = parseTimestamp(skipTimes?.intro);
            const aniOutro = parseTimestamp(skipTimes?.outro);
            if (aniIntro) setIntro(aniIntro);
            if (aniOutro) setOutro(aniOutro);
          });
      }
      if (data.subtitles?.length) {
        setSubtitles(data.subtitles);
      } else if (audio === "dub") {
        // Dub streams often have no embedded subtitle tracks.
        // Fetch the sub stream in the background and borrow its subtitles so
        // the captions toggle still works when the user is watching dubbed audio.
        const subEpId = providersDataRef.current?.[selectedProvider]?.episodes?.["sub"]
          ?.find((e) => e.number === episode)?.id;
        const subUrl = subEpId
          ? `/api/stream?episodeId=${encodeURIComponent(subEpId)}`
          : `/api/stream?id=${animeId}&ep=${episode}&provider=${encodeURIComponent(selectedProvider)}&audio=sub`;
        fetch(subUrl)
          .then((r) => r.ok ? r.json() : null)
          .then((sd: { subtitles?: SubtitleTrack[] } | null) => {
            if (sd?.subtitles?.length) setSubtitles(sd.subtitles);
          })
          .catch(() => {});
      }

      if (Hls.isSupported()) {
        const hls = new Hls({ maxMaxBufferLength: 30 });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          video.playbackRate = speedRef.current;
          if (resumeAt > 0) video.currentTime = resumeAt;
          if (autoplayRef.current) video.play().catch(() => {});

          // Build a deduplicated, height-sorted level list for the quality picker.
          const byHeight = new Map<number, HLSLevel>();
          hls.levels.forEach((l, i) => {
            const h = l.height || 0;
            const existing = byHeight.get(h);
            if (!existing || l.bitrate > existing.bitrate) {
              byHeight.set(h, { index: i, height: h, bitrate: l.bitrate });
            }
          });
          const sorted = Array.from(byHeight.values()).sort((a, b) => b.height - a.height);
          setHlsLevels(sorted);
        });
        hls.on(Hls.Events.ERROR, (_e, d) => {
          if (d.fatal) {
            setError("Playback error — try a different source.");
            setLoading(false);
            onErrorRef.current?.(selectedProvider);
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
        video.onloadedmetadata = () => {
          setLoading(false);
          video.playbackRate = speedRef.current;
          if (resumeAt > 0) video.currentTime = resumeAt;
          if (autoplayRef.current) video.play().catch(() => {});
        };
      } else {
        throw new Error("Your browser does not support HLS playback.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Streaming is unavailable.");
      setLoading(false);
      onErrorRef.current?.(selectedProvider);
    }
  }, [animeId, episode, selectedProvider, audio, malId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initPlayer();
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [initPlayer, retryKey]);

  // ── Video event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay   = () => setPlaying(true);
    const onPause  = () => setPlaying(false);
    const onEnded  = () => { setPlaying(false); onEpisodeEndRef.current?.(); };
    const onDur    = () => setDuration(video.duration || 0);
    const onVolume = () => { setVolume(video.volume); setMuted(video.muted); };
    const onTime   = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length && video.duration) {
        setBufferedPct((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
      }
    };

    video.addEventListener("play",           onPlay);
    video.addEventListener("pause",          onPause);
    video.addEventListener("ended",          onEnded);
    video.addEventListener("durationchange", onDur);
    video.addEventListener("volumechange",   onVolume);
    video.addEventListener("timeupdate",     onTime);
    return () => {
      video.removeEventListener("play",           onPlay);
      video.removeEventListener("pause",          onPause);
      video.removeEventListener("ended",          onEnded);
      video.removeEventListener("durationchange", onDur);
      video.removeEventListener("volumechange",   onVolume);
      video.removeEventListener("timeupdate",     onTime);
    };
  }, []);

  // ── Skip zone detection + auto-skip (intro AND outro) ────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handler = () => {
      const t = video.currentTime;
      if      (intro && t >= intro.start && t < intro.end) setSkipZone("intro");
      else if (outro && t >= outro.start && t < outro.end) setSkipZone("outro");
      else setSkipZone(null);

      if (autoSkipRef.current) {
        if (intro && t >= intro.start && t < intro.end) {
          video.currentTime = intro.end;
        } else if (outro && t >= outro.start && t < outro.end) {
          video.currentTime = outro.end;
        }
      }
    };
    video.addEventListener("timeupdate", handler);
    return () => video.removeEventListener("timeupdate", handler);
  }, [intro, outro]);

  // ── Fullscreen change ─────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setFullscreen(
      !!document.fullscreenElement || !!(document as unknown as Record<string,unknown>).webkitFullscreenElement
    );
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const video = videoRef.current;
      if (!video) return;
      if (e.code === "Space" || e.code === "KeyK") {
        e.preventDefault();
        video.paused ? video.play().catch(() => {}) : video.pause();
      }
      if (e.code === "ArrowLeft")  { e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 10); }
      if (e.code === "ArrowRight") { e.preventDefault(); video.currentTime = Math.min(video.duration || 0, video.currentTime + 10); }
      if (e.code === "ArrowUp")    { e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); }
      if (e.code === "ArrowDown")  { e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); }
      if (e.code === "KeyM")       { video.muted = !video.muted; }
      if (e.code === "KeyC")       { setCaptionsOn(!usePlayerPrefsStore.getState().captionsOn); }
      if (e.code === "KeyF") {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.code === "Comma")  { const i = SPEEDS.indexOf(speedRef.current); setSpeed(SPEEDS[Math.max(0, i - 1)]); }
      if (e.code === "Period") { const i = SPEEDS.indexOf(speedRef.current); setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, i + 1)]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist watch progress ────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let lastSave = 0;
    const ssKey  = `bankai-progress-${animeId}-${episode}`;

    function saveProgress(completed = false) {
      if (!video || !video.duration) return;
      const pos = Math.floor(video.currentTime);
      // Always save to sessionStorage — works even when not logged in
      try { sessionStorage.setItem(ssKey, String(pos)); } catch {}

      if (!currentUserRef.current) return;
      const pData    = providersDataRef.current;
      const provider = selectedProviderRef.current ?? "";
      const aud      = audioRef.current;
      const epData   =
        pData?.[provider]?.episodes?.[aud]?.find((e) => e.number === episode) ??
        Object.values(pData ?? {}).flatMap((p) => p.episodes?.[aud] ?? []).find((e) => e.number === episode);
      const thumbnail = epData?.thumbnail ?? epData?.image ?? null;
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username:        currentUserRef.current,
          animeId:         `anilist:${animeId}`,
          episodeNumber:   episode,
          progress:        pos,
          duration:        Math.floor(video.duration),
          completed,
          episodeThumbnail: thumbnail,
          animeTitle:      animeTitleRef.current,
          animeCover:      animeCoverRef.current,
        }),
      }).catch(() => {});
    }

    const onTime  = () => { const n = Date.now(); if (n - lastSave > 30000) { lastSave = n; saveProgress(); } };
    const onPause = () => saveProgress();
    const onEnded = () => saveProgress(true);

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("pause",      onPause);
    video.addEventListener("ended",      onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("pause",      onPause);
      video.removeEventListener("ended",      onEnded);
    };
  }, [animeId, episode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Control visibility auto-hide ──────────────────────────────────────────
  function bumpControls() {
    setShowCtrl(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowCtrl(false);
    }, 3000);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play().catch(() => {}) : v.pause();
  }

  function toggleFullscreen() {
    const el    = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;
    const doc = document as unknown as Record<string, unknown>;
    const isFs = !!document.fullscreenElement || !!doc.webkitFullscreenElement;
    if (isFs) {
      if (document.exitFullscreen) document.exitFullscreen();
      else (doc.webkitExitFullscreen as (() => void) | undefined)?.();
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {
        (video as unknown as Record<string, unknown>).webkitEnterFullscreen &&
          ((video as unknown as Record<string, () => void>).webkitEnterFullscreen)();
      });
    } else {
      (video as unknown as Record<string, () => void>).webkitEnterFullscreen?.();
    }
  }

  function seek(clientX: number) {
    const bar = progressRef.current;
    const v   = videoRef.current;
    if (!bar || !v || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * v.duration;
  }

  function seekTouch(e: React.TouchEvent) {
    const bar = progressRef.current;
    const v   = videoRef.current;
    if (!bar || !v || !v.duration) return;
    const touch = e.touches[0] ?? e.changedTouches[0];
    if (!touch) return;
    const rect = bar.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width)) * v.duration;
  }

  function handleAudioChange(a: "sub" | "dub") {
    onAudioChange(a);
    if (providersData) onProviderChange(firstAvailableProvider(providersData, a, episode));
  }

  function handleQualitySelect(levelIndex: number) {
    setSelectedLevel(levelIndex);
    setSettingsPanelOpen(false);
    const hls = hlsRef.current;
    if (!hls) return;
    if (levelIndex === -1) {
      hls.currentLevel = -1; // auto
    } else {
      hls.currentLevel = levelIndex;
    }
  }

  function qualityLabel(): string {
    if (selectedLevel === -1) return "Auto";
    const l = hlsLevels.find((l) => l.index === selectedLevel);
    return l?.height ? `${l.height}p` : "Auto";
  }

  function handleScreenshot() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `bankai-ep${episode}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  function handlePiP() {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if ((document as unknown as Record<string,unknown>).pictureInPictureEnabled) {
      (video as unknown as { requestPictureInPicture: () => Promise<unknown> })
        .requestPictureInPicture().catch(() => {});
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="overflow-hidden rounded-xl bg-black shadow-2xl">

      {/* ── Video container ───────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full cursor-pointer select-none bg-black"
        onMouseMove={embedUrl ? undefined : bumpControls}
        onMouseLeave={embedUrl ? undefined : () => { if (!videoRef.current?.paused) setShowCtrl(false); }}
        onTouchStart={embedUrl ? undefined : bumpControls}
        onClick={(e) => {
          if (embedUrl) return;
          if ((e.target as HTMLElement).closest("button,input")) return;
          togglePlay();
          bumpControls();
        }}
      >
        {/* Poster (HLS only) */}
        {poster && !embedUrl && (
          <img
            src={poster} alt=""
            className={[
              "pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-500",
              loading ? "opacity-50" : "opacity-0",
            ].join(" ")}
          />
        )}

        {/* Video (HLS mode) */}
        {!embedUrl && (
          <video
            ref={videoRef}
            playsInline
            className="size-full object-contain"
            style={{ display: error ? "none" : "block" }}
          >
            {subtitles.map((s, i) => (
              <track
                key={i}
                kind={(s.kind as React.ComponentProps<"track">["kind"]) ?? "subtitles"}
                src={s.file}
                label={s.label ?? "Subtitles"}
              />
            ))}
          </video>
        )}

        {/* Iframe embed player (Anikoto / MegaPlay) */}
        {embedUrl && (
          <iframe
            key={embedUrl}
            src={embedUrl}
            className="absolute inset-0 size-full border-0"
            allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        )}

        {/* Loading (HLS only) */}
        {loading && !embedUrl && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
            <MI name="progress_activity" size={48} className="animate-spin text-white/80" />
            <p className="text-sm font-medium text-white/50">Loading episode {episode}…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/95 px-6 text-center">
            <div className="rounded-full bg-red-500/10 p-4">
              <MI name="warning" size={32} className="text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-white">{error}</p>
              <p className="mt-1 text-sm text-white/40">Try a different server below</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setError(null); setRetryKey((k) => k + 1); }}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors [touch-action:manipulation]"
            >
              <MI name="refresh" size={16} /> Retry
            </button>
          </div>
        )}

        {/* Centre pause indicator (HLS only) */}
        {!embedUrl && !loading && !error && !playing && duration > 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
              <MI name="play_arrow" size={28} className="translate-x-0.5 text-white" />
            </div>
          </div>
        )}

        {/* Skip intro/outro (HLS only) */}
        {!embedUrl && !loading && !error && (
          <div className="absolute bottom-20 right-4 z-10 flex flex-col items-end gap-2">
            {intro && currentTime >= intro.start && currentTime < intro.end && (
              <button
                onClick={(e) => { e.stopPropagation(); if (videoRef.current) videoRef.current.currentTime = intro.end; }}
                className="flex items-center gap-2 rounded-lg border border-amber-700/50 bg-black/85 px-4 py-2.5 text-sm font-bold text-amber-500 shadow-lg backdrop-blur-sm transition-all hover:bg-amber-700/20 active:scale-95 [touch-action:manipulation]"
              >
                <MI name="skip_next" size={16} />
                Skip Intro
              </button>
            )}
            {outro && currentTime >= outro.start && currentTime < outro.end && (
              <button
                onClick={(e) => { e.stopPropagation(); if (videoRef.current) videoRef.current.currentTime = outro.end; }}
                className="flex items-center gap-2 rounded-lg border border-amber-700/50 bg-black/85 px-4 py-2.5 text-sm font-bold text-amber-500 shadow-lg backdrop-blur-sm transition-all hover:bg-amber-700/20 active:scale-95 [touch-action:manipulation]"
              >
                <MI name="skip_next" size={16} />
                Skip Outro
              </button>
            )}
          </div>
        )}

        {/* ── Custom control overlay (HLS only) ───────────────────────────── */}
        {!embedUrl && !error && (() => {
          /* ── Shared: caption style panel ────────────────────────────────── */
          const captionPanel = captionPanelOpen ? (
            <div className="absolute bottom-10 right-0 z-30 w-64 rounded-xl border border-white/10 bg-[#1c1c1c] p-3 shadow-2xl">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Captions</p>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-white/70">Show Captions</span>
                <button onClick={() => setCaptionsOn(!captionsOn)}
                  className={["relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 [touch-action:manipulation]",
                    captionsOn ? "bg-primary" : "bg-white/15"].join(" ")}>
                  <span className={["absolute size-3.5 rounded-full bg-white shadow transition-transform duration-200",
                    captionsOn ? "translate-x-[19px]" : "translate-x-[2px]"].join(" ")} />
                </button>
              </div>
              {subtitles.length === 0 && (
                <p className="mb-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/40">No subtitles available.</p>
              )}
              {subtitles.length > 1 && (
                <>
                  <p className="mb-1 text-[10px] font-medium text-white/35">TRACK</p>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {subtitles.map((s, i) => (
                      <button key={i} onClick={() => { setSelectedTrack(i); setCaptionsOn(true); }}
                        className={["rounded px-2.5 py-1 text-xs font-medium transition-colors [touch-action:manipulation]",
                          selectedTrack === i && captionsOn ? "bg-primary text-black" : "bg-white/10 text-white/70 hover:bg-white/15"].join(" ")}>
                        {s.label || `Track ${i + 1}`}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="mb-1 text-[10px] font-medium text-white/35">SIZE</p>
              <div className="mb-3 flex gap-1.5">
                {[{ l: "S", v: "75" }, { l: "M", v: "100" }, { l: "L", v: "125" }, { l: "XL", v: "150" }].map(({ l, v }) => (
                  <button key={v} onClick={() => setCaptionSize(v)}
                    className={["rounded px-2.5 py-1 text-xs font-medium transition-colors [touch-action:manipulation]",
                      captionSize === v ? "bg-primary text-black" : "bg-white/10 text-white/70 hover:bg-white/15"].join(" ")}>{l}</button>
                ))}
              </div>
              <p className="mb-1 text-[10px] font-medium text-white/35">TEXT COLOR</p>
              <div className="mb-3 flex gap-2">
                {CAPTION_COLORS.map((c) => (
                  <button key={c} onClick={() => setCaptionColor(c)} title={c}
                    className={["size-5 rounded-full border-2 transition-transform hover:scale-110 [touch-action:manipulation]",
                      captionColor === c ? "border-white scale-110" : "border-transparent"].join(" ")}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <p className="mb-1 text-[10px] font-medium text-white/35">BACKGROUND</p>
              <div className="mb-3 flex gap-1.5">
                {CAPTION_BGS.map(({ l, v }) => (
                  <button key={l} onClick={() => setCaptionBg(v)}
                    className={["rounded px-2.5 py-1 text-xs font-medium transition-colors [touch-action:manipulation]",
                      captionBg === v ? "bg-primary text-black" : "bg-white/10 text-white/70 hover:bg-white/15"].join(" ")}>{l}</button>
                ))}
              </div>
              <p className="mb-1 text-[10px] font-medium text-white/35">FONT</p>
              <div className="flex flex-wrap gap-1.5">
                {CAPTION_FONTS.map(({ l, v }) => (
                  <button key={l} onClick={() => setCaptionFont(v)}
                    className={["rounded px-2.5 py-1 text-xs font-medium transition-colors [touch-action:manipulation]",
                      captionFont === v ? "bg-primary text-black" : "bg-white/10 text-white/70 hover:bg-white/15"].join(" ")}
                    style={{ fontFamily: v }}>{l}</button>
                ))}
              </div>
            </div>
          ) : null;

          /* ── Shared: combined quality + speed panel ──────────────────────── */
          const settingsPanel = settingsPanelOpen ? (
            <div className="absolute bottom-8 right-0 z-30 w-52 overflow-hidden rounded-xl border border-white/[0.05] bg-[#1a1a1a] shadow-2xl">
              <p className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">Speed</p>
              {SPEEDS.map((s) => (
                <button key={s} onClick={() => { setSpeed(s); setSettingsPanelOpen(false); }}
                  className={["flex w-full items-center justify-between gap-6 px-4 py-1.5 text-xs transition-colors hover:bg-white/5 [touch-action:manipulation]",
                    s === speed ? "text-primary font-semibold" : "text-white/75"].join(" ")}>
                  {s}x {s === 1 && <span className="text-white/30">Normal</span>}
                </button>
              ))}
              {hlsLevels.length > 0 && (
                <>
                  <div className="my-1 border-t border-white/[0.06]" />
                  <p className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">Quality</p>
                  <button onClick={() => handleQualitySelect(-1)}
                    className={["flex w-full items-center justify-between gap-6 px-4 py-1.5 text-xs transition-colors hover:bg-white/5 [touch-action:manipulation]",
                      selectedLevel === -1 ? "text-primary font-semibold" : "text-white/75"].join(" ")}>
                    Auto <span className="text-white/30">Recommended</span>
                  </button>
                  {hlsLevels.map((l) => (
                    <button key={l.index} onClick={() => { handleQualitySelect(l.index); setSettingsPanelOpen(false); }}
                      className={["flex w-full items-center justify-between gap-6 px-4 py-1.5 text-xs transition-colors hover:bg-white/5 [touch-action:manipulation]",
                        selectedLevel === l.index ? "text-primary font-semibold" : "text-white/75"].join(" ")}>
                      {l.height ? `${l.height}p` : `Q${l.index + 1}`}
                      <span className="text-white/25">{l.bitrate >= 1_000_000 ? `${(l.bitrate / 1_000_000).toFixed(1)}Mb` : `${Math.round(l.bitrate / 1000)}Kb`}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          ) : null;

          /* ── Shared: intro/outro cut markers ────────────────────────────── */
          // Each cut = dark gap across the bar + white tick marks above & below it.
          // Collect all cut-point timestamps, then render one set of marks per point.
          const cutPoints: number[] = [];
          if (intro  && duration > 0) { cutPoints.push(intro.start,  intro.end);  }
          if (outro  && duration > 0) { cutPoints.push(outro.start,  outro.end);  }

          const cutMarkers = cutPoints.length > 0 ? (
            <>
              {cutPoints.map((t, i) => {
                const pct = `${(t / duration) * 100}%`;
                return (
                  <React.Fragment key={i}>
                    {/* White tick above the bar */}
                    <div className="pointer-events-none absolute z-20"
                      style={{ left: pct, bottom: "100%", width: "2px", height: "6px", transform: "translateX(-50%)", background: "rgba(255,255,255,0.95)", borderRadius: "1px 1px 0 0" }} />
                    {/* Dark gap through the bar (the actual "cut") */}
                    <div className="pointer-events-none absolute inset-y-0 z-20"
                      style={{ left: pct, width: "3px", transform: "translateX(-50%)", background: "rgba(0,0,0,0.75)" }} />
                    {/* White tick below the bar */}
                    <div className="pointer-events-none absolute z-20"
                      style={{ left: pct, top: "100%", width: "2px", height: "6px", transform: "translateX(-50%)", background: "rgba(255,255,255,0.95)", borderRadius: "0 0 1px 1px" }} />
                  </React.Fragment>
                );
              })}
            </>
          ) : null;

          /* ── Shared: progress bar drag handlers ─────────────────────────── */
          const barHandlers = {
            style: { touchAction: "none" as const },
            onMouseDown: (e: React.MouseEvent) => { scrubbingRef.current = true; seek(e.clientX); },
            onMouseMove: (e: React.MouseEvent) => { if (scrubbingRef.current) seek(e.clientX); },
            onMouseUp:   () => { scrubbingRef.current = false; },
            onMouseLeave:() => { scrubbingRef.current = false; },
            onTouchStart:(e: React.TouchEvent) => { e.stopPropagation(); scrubbingRef.current = true; seekTouch(e); },
            onTouchMove: (e: React.TouchEvent) => { if (scrubbingRef.current) { e.preventDefault(); seekTouch(e); } },
            onTouchEnd:  () => { scrubbingRef.current = false; },
          };

          const visible = showCtrl || !playing;

          /* ── PLYR: Crunchyroll-style ─────────────────────────────────────── */
          if (playerType === "plyr") return (
            <div className={["absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-14 transition-opacity duration-300",
              visible ? "opacity-100" : "opacity-0 pointer-events-none"].join(" ")}
              onClick={(e) => e.stopPropagation()}>

              {/* ── Segmented progress bar: gaps between segments = chapter cuts ─ */}
              <div ref={progressRef} {...barHandlers}
                className="group/bar relative mb-2.5 h-[5px] cursor-pointer overflow-visible transition-[height] duration-150 hover:h-[9px]">
                {duration > 0 ? (() => {
                  const pts = [...new Set([
                    0,
                    ...(intro ? [intro.start, intro.end] : []),
                    ...(outro ? [outro.start, outro.end] : []),
                    duration,
                  ].filter((p) => p >= 0 && p <= duration))].sort((a, b) => a - b);
                  const bufTime = (bufferedPct / 100) * duration;
                  return pts.slice(0, -1).map((s, idx) => {
                    const e    = pts[idx + 1];
                    const dur  = e - s;
                    const skip = (!!intro && s >= intro.start - 0.05 && e <= intro.end + 0.05) ||
                                 (!!outro && s >= outro.start - 0.05 && e <= outro.end + 0.05);
                    const lPct    = (s / duration) * 100;
                    const wPct    = (dur / duration) * 100;
                    const watchPct = dur > 0 ? Math.max(0, Math.min(100, ((Math.min(currentTime, e) - s) / dur) * 100)) : 0;
                    const bufPct   = dur > 0 ? Math.max(0, Math.min(100, ((Math.min(bufTime, e) - s) / dur) * 100)) : 0;
                    return (
                      <div key={idx}
                        className="absolute inset-y-0 overflow-hidden rounded-[2px]"
                        style={{ left: `calc(${lPct}% + 1.5px)`, width: `calc(${wPct}% - 3px)` }}>
                        <div className={["absolute inset-0", skip ? "bg-white/[0.16]" : "bg-white/[0.32]"].join(" ")} />
                        {bufPct > watchPct && (
                          <div className="absolute inset-y-0 left-0 bg-white/40" style={{ width: `${bufPct}%` }} />
                        )}
                        {watchPct > 0 && (
                          <div className={["absolute inset-y-0 left-0", skip ? "bg-white/70" : "bg-white"].join(" ")}
                            style={{ width: `${watchPct}%` }} />
                        )}
                      </div>
                    );
                  });
                })() : (
                  <div className="absolute inset-y-0 left-0 w-full rounded-[2px] bg-white/20" />
                )}
                {/* Scrubber dot */}
                <div className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-white shadow-lg transition-transform group-hover/bar:scale-100"
                  style={{ left: `${progress}%` }} />
              </div>

              {/* ── Controls row ─────────────────────────────────────────────── */}
              <div className="flex items-center gap-1">

                {/* Play / Pause */}
                <button onClick={togglePlay} disabled={loading}
                  className="flex size-9 shrink-0 items-center justify-center text-white transition-opacity disabled:opacity-40 [touch-action:manipulation]">
                  {playing ? <MI name="pause" size={22} /> : <MI name="play_arrow" size={22} />}
                </button>

                {/* Next episode */}
                <button onClick={onNextEpisode} disabled={totalEpisodes > 0 && episode >= totalEpisodes}
                  title="Next episode"
                  className="flex size-9 shrink-0 items-center justify-center text-white/70 transition-colors hover:text-white disabled:opacity-30 [touch-action:manipulation]">
                  <MI name="skip_next" size={20} />
                </button>

                {/* Volume */}
                <div className="flex items-center gap-1">
                  <button onClick={() => { const v = videoRef.current; if (v) v.muted = !v.muted; }}
                    className="flex items-center text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                    {muted || volume === 0 ? <MI name="volume_off" size={20} /> : <MI name="volume_up" size={20} />}
                  </button>
                  <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                    onChange={(e) => { const v = videoRef.current; if (!v) return; const val = parseFloat(e.target.value); v.volume = val; v.muted = val === 0; }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-14 cursor-pointer accent-white" />
                </div>

                {/* Time */}
                <span className="ml-1 shrink-0 text-xs tabular-nums text-white/80">
                  {fmt(currentTime)} / {fmt(duration)}
                </span>

                <div className="flex-1" />

                {/* ↺ 10 */}
                <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }}
                  title="-10s" className="flex size-9 shrink-0 items-center justify-center text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                  <MI name="replay_10" size={22} />
                </button>

                {/* ↻ 10 */}
                <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }}
                  title="+10s" className="flex size-9 shrink-0 items-center justify-center text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                  <MI name="forward_10" size={22} />
                </button>

                {/* CC */}
                <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setCaptionPanelOpen(false); }}>
                  <button onClick={() => { setCaptionPanelOpen((o) => !o); setSettingsPanelOpen(false); }}
                    title="Captions (C)"
                    className={["flex size-9 items-center justify-center transition-colors [touch-action:manipulation]",
                      captionPanelOpen ? "text-primary" : captionsOn ? "text-white/80 hover:text-white" : "text-white/30 hover:text-white/60"].join(" ")}>
                    {captionsOn ? <MI name="closed_caption" size={20} /> : <MI name="closed_caption_disabled" size={20} />}
                  </button>
                  {captionPanel}
                </div>

                {/* Download (placeholder) */}
                <button title="Download" className="flex size-9 items-center justify-center text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                  <MI name="download" size={20} />
                </button>

                {/* Screenshot */}
                <button onClick={handleScreenshot} title="Screenshot"
                  className="flex size-9 items-center justify-center text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                  <MI name="photo_camera" size={20} />
                </button>

                {/* Theater mode (lights off) */}
                <button onClick={() => onLightsOffChange(!lightsOff)} title="Theater mode"
                  className={["flex size-9 items-center justify-center transition-colors [touch-action:manipulation]",
                    lightsOff ? "text-primary" : "text-white/70 hover:text-white"].join(" ")}>
                  <MI name="tv" size={20} />
                </button>

                {/* Settings (speed + quality) */}
                <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSettingsPanelOpen(false); }}>
                  <button onClick={() => { setSettingsPanelOpen((o) => !o); setCaptionPanelOpen(false); }}
                    title="Settings"
                    className={["flex size-9 items-center justify-center transition-colors [touch-action:manipulation]",
                      settingsPanelOpen ? "text-primary" : "text-white/70 hover:text-white"].join(" ")}>
                    <MI name="settings" size={20} />
                  </button>
                  {settingsPanel}
                </div>

                {/* Cast (placeholder) */}
                <button title="Cast" className="flex size-9 items-center justify-center text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                  <MI name="cast" size={20} />
                </button>

                {/* PiP */}
                <button onClick={handlePiP} title="Picture in Picture"
                  className="flex size-9 items-center justify-center text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                  <MI name="picture_in_picture_alt" size={20} />
                </button>

                {/* Fullscreen */}
                <button onClick={toggleFullscreen} title="Fullscreen (F)"
                  className="flex size-9 items-center justify-center text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                  {fullscreen ? <MI name="fullscreen_exit" size={20} /> : <MI name="fullscreen" size={20} />}
                </button>
              </div>
            </div>
          );

          /* ── NATV: Plyr-style (inline progress, time remaining) ─────────── */
          if (playerType === "natv") return (
            <div className={["absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-10 transition-opacity duration-300",
              visible ? "opacity-100" : "opacity-0 pointer-events-none"].join(" ")}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">

                {/* Play */}
                <button onClick={togglePlay} disabled={loading}
                  className="shrink-0 text-white disabled:opacity-40 [touch-action:manipulation]">
                  {playing ? <MI name="pause" size={18} /> : <MI name="play_arrow" size={18} />}
                </button>

                {/* Inline segmented progress bar — same chapter cuts as plyr */}
                <div ref={progressRef} {...barHandlers}
                  className="group/bar relative h-[9px] flex-1 cursor-pointer overflow-visible transition-[height] duration-150 hover:h-3">
                  {duration > 0 ? (() => {
                    const pts = [...new Set([
                      0,
                      ...(intro ? [intro.start, intro.end] : []),
                      ...(outro ? [outro.start, outro.end] : []),
                      duration,
                    ].filter((p) => p >= 0 && p <= duration))].sort((a, b) => a - b);
                    const bufTime = (bufferedPct / 100) * duration;
                    return pts.slice(0, -1).map((s, idx) => {
                      const e    = pts[idx + 1];
                      const dur  = e - s;
                      const skip = (!!intro && s >= intro.start - 0.05 && e <= intro.end + 0.05) ||
                                   (!!outro && s >= outro.start - 0.05 && e <= outro.end + 0.05);
                      const lPct    = (s / duration) * 100;
                      const wPct    = (dur / duration) * 100;
                      const watchPct = dur > 0 ? Math.max(0, Math.min(100, ((Math.min(currentTime, e) - s) / dur) * 100)) : 0;
                      const bufPct   = dur > 0 ? Math.max(0, Math.min(100, ((Math.min(bufTime, e) - s) / dur) * 100)) : 0;
                      return (
                        <div key={idx}
                          className="absolute inset-y-0 overflow-hidden rounded-[2px]"
                          style={{ left: `calc(${lPct}% + 1.5px)`, width: `calc(${wPct}% - 3px)` }}>
                          <div className={["absolute inset-0", skip ? "bg-white/[0.16]" : "bg-white/[0.32]"].join(" ")} />
                          {bufPct > watchPct && (
                            <div className="absolute inset-y-0 left-0 bg-white/40" style={{ width: `${bufPct}%` }} />
                          )}
                          {watchPct > 0 && (
                            <div className={["absolute inset-y-0 left-0", skip ? "bg-primary/70" : "bg-primary"].join(" ")}
                              style={{ width: `${watchPct}%` }} />
                          )}
                        </div>
                      );
                    });
                  })() : (
                    <div className="absolute inset-y-0 left-0 w-full rounded-[2px] bg-white/25" />
                  )}
                  {/* Always-visible scrubber dot */}
                  <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg transition-all group-hover/bar:size-3.5"
                    style={{ left: `${progress}%` }} />
                </div>

                {/* Time remaining */}
                <span className="shrink-0 text-xs tabular-nums text-white/80">
                  {fmtRemaining(currentTime, duration)}
                </span>

                {/* Volume */}
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { const v = videoRef.current; if (v) v.muted = !v.muted; }}
                    className="flex shrink-0 items-center text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                    {muted || volume === 0 ? <MI name="volume_off" size={18} /> : <MI name="volume_up" size={18} />}
                  </button>
                  <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                    onChange={(e) => { const v = videoRef.current; if (!v) return; const val = parseFloat(e.target.value); v.volume = val; v.muted = val === 0; }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-14 cursor-pointer accent-primary" />
                </div>

                {/* CC toggle */}
                <button onClick={() => setCaptionsOn(!captionsOn)} title="Captions"
                  className={[captionsOn ? "text-primary" : "text-white/40 hover:text-white/70", "transition-colors [touch-action:manipulation]"].join(" ")}>
                  {captionsOn ? <MI name="closed_caption" size={18} /> : <MI name="closed_caption_disabled" size={18} />}
                </button>

                {/* Settings */}
                <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSettingsPanelOpen(false); }}>
                  <button onClick={() => { setSettingsPanelOpen((o) => !o); setCaptionPanelOpen(false); }}
                    className={[settingsPanelOpen ? "text-primary" : "text-white/70 hover:text-white", "transition-colors [touch-action:manipulation]"].join(" ")}
                    title="Settings">
                    <MI name="settings" size={18} />
                  </button>
                  {settingsPanel}
                </div>

                {/* External link (placeholder) */}
                <button title="Open externally" className="text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                  <MI name="open_in_new" size={18} />
                </button>

                {/* Fullscreen */}
                <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                  {fullscreen ? <MI name="fullscreen_exit" size={18} /> : <MI name="fullscreen" size={18} />}
                </button>
              </div>
            </div>
          );

          /* ── VIDK: YouTube-minimal (thin bottom bar) ─────────────────────── */
          return (
            <div className={["absolute inset-x-0 bottom-0 transition-opacity duration-300",
              visible ? "opacity-100" : "opacity-0 pointer-events-none"].join(" ")}
              onClick={(e) => e.stopPropagation()}>

              {/* Controls bar */}
              <div className="flex items-center gap-2.5 bg-gradient-to-t from-black/80 to-transparent px-3 pb-1.5 pt-8">
                {/* Play */}
                <button onClick={togglePlay} disabled={loading}
                  className="text-white disabled:opacity-40 [touch-action:manipulation]">
                  {playing ? <MI name="pause" size={20} /> : <MI name="play_arrow" size={20} />}
                </button>

                {/* Time */}
                <span className="text-[13px] tabular-nums text-white/90">
                  {fmt(currentTime)} / {fmt(duration)}
                </span>

                <div className="flex-1" />

                {/* Volume */}
                <button onClick={() => { const v = videoRef.current; if (v) v.muted = !v.muted; }}
                  className="text-white/80 hover:text-white transition-colors [touch-action:manipulation]">
                  {muted || volume === 0 ? <MI name="volume_off" size={20} /> : <MI name="volume_up" size={20} />}
                </button>

                {/* Fullscreen */}
                <button onClick={toggleFullscreen}
                  className="text-white/80 hover:text-white transition-colors [touch-action:manipulation]">
                  {fullscreen ? <MI name="fullscreen_exit" size={20} /> : <MI name="fullscreen" size={20} />}
                </button>

                {/* ⋮ More */}
                <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSettingsPanelOpen(false); }}>
                  <button onClick={() => setSettingsPanelOpen((o) => !o)}
                    className="text-white/80 hover:text-white transition-colors [touch-action:manipulation]">
                    <MI name="more_vert" size={20} />
                  </button>
                  {settingsPanel}
                </div>
              </div>

              {/* Thin progress bar at absolute bottom edge */}
              <div ref={progressRef} {...barHandlers}
                className="group/bar relative h-[3px] w-full cursor-pointer bg-white/25 hover:h-1 transition-all duration-150">
                <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${bufferedPct}%` }} />
                <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${progress}%` }} />
                {intro && duration > 0 && (
                  <div className="pointer-events-none absolute inset-y-0 bg-amber-400/60"
                    style={{ left: `${(intro.start / duration) * 100}%`, width: `${((intro.end - intro.start) / duration) * 100}%` }} />
                )}
                {outro && duration > 0 && (
                  <div className="pointer-events-none absolute inset-y-0 bg-amber-400/60"
                    style={{ left: `${(outro.start / duration) * 100}%`, width: `${((outro.end - outro.start) / duration) * 100}%` }} />
                )}
                <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-white shadow group-hover/bar:scale-100 transition-transform"
                  style={{ left: `${progress}%` }} />
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Settings bar below video ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/[0.05] bg-[#111] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-4">
          <Toggle label="Autoplay"  active={autoplay}  onClick={() => onAutoplayChange(!autoplay)} />
          <Toggle label="Auto Skip" active={autoSkip}  accent onClick={() => onAutoSkipChange(!autoSkip)} />
          <Toggle label="Auto Next" active={autoNext}  onClick={() => onAutoNextChange(!autoNext)} />
          <button
            onClick={() => onLightsOffChange(!lightsOff)}
            className="flex items-center gap-2 whitespace-nowrap text-xs font-medium text-white/50 transition-colors hover:text-white/80 [touch-action:manipulation]"
          >
            <span className={["relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors duration-200",
              lightsOff ? "bg-primary" : "bg-white/15"].join(" ")}>
              <span className={["absolute size-2.5 rounded-full bg-white shadow transition-transform duration-200",
                lightsOff ? "translate-x-[11px]" : "translate-x-[1px]"].join(" ")} />
            </span>
            Lights Off
          </button>

          {/* Player type cycling button: Plyr → Natv → Vidk → Plyr */}
          <button
            onClick={() => {
              const idx = PLAYER_TYPES.indexOf(playerType);
              setPlayerType(PLAYER_TYPES[(idx + 1) % PLAYER_TYPES.length]);
            }}
            title="Switch player type"
            className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white/70 transition-colors hover:bg-white/15 hover:text-white [touch-action:manipulation]"
          >
            <MI name="play_arrow" size={10} className="text-white/70" />
            {playerType}
          </button>
        </div>

        {/* Prev / Next episode */}
        <div className="flex items-center gap-3 text-xs font-medium">
          <button onClick={onPrevEpisode} disabled={episode <= 1}
            className="flex items-center gap-1 text-white/50 transition-colors hover:text-white disabled:opacity-25 [touch-action:manipulation]">
            <MI name="skip_previous" size={14} /> Prev
          </button>
          <span className="text-white/25">|</span>
          <button onClick={onNextEpisode}
            disabled={totalEpisodes > 0 && episode >= totalEpisodes}
            className="flex items-center gap-1 text-white/50 transition-colors hover:text-white disabled:opacity-25 [touch-action:manipulation]">
            Ep {episode + 1} <MI name="skip_next" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
