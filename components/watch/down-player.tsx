"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { useAuthStore } from "@/store/auth-store";
import { usePlayerPrefsStore } from "@/store/player-prefs-store";
import { firstAvailableProvider, type EpisodesMap } from "./episode-utils";

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

type SettingsView =
  | "main"
  | "speed"
  | "quality"
  | "captions"
  | "captionStyles"
  | "accessibility"
  | "volumeBoost";

function parseTimestamp(raw: Timestamp | Record<string, number> | null | undefined): Timestamp | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, number>;
  const start = r.start ?? r.startTime ?? -1;
  const end   = r.end   ?? r.endTime   ?? -1;
  if (typeof start !== "number" || typeof end !== "number") return null;
  if (start < 0 || end <= start + 5) return null;
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

// Shared pill toggle used inside settings sub-panels
function PillToggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "relative inline-flex h-[22px] w-10 shrink-0 items-center rounded-full transition-colors duration-200 [touch-action:manipulation]",
        active ? "bg-primary" : "bg-white/20",
      ].join(" ")}
    >
      <span className={[
        "absolute size-4 rounded-full bg-white shadow transition-transform duration-200",
        active ? "translate-x-[21px]" : "translate-x-[2px]",
      ].join(" ")} />
    </button>
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
  const videoRef     = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressRef  = useRef<HTMLDivElement | null>(null);
  const hlsRef       = useRef<Hls | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubbingRef = useRef(false);

  // Web Audio API for volume boost
  const audioCtxRef        = useRef<AudioContext | null>(null);
  const gainNodeRef        = useRef<GainNode | null>(null);
  const streamDestRef      = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioConnectedRef  = useRef(false);

  const currentUser = useAuthStore((s) => s.currentUser);

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
  const [embedUrl,  setEmbedUrl]  = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [retryKey,  setRetryKey]  = useState(0);
  const [intro,     setIntro]     = useState<Timestamp | null>(null);
  const [outro,     setOutro]     = useState<Timestamp | null>(null);
  const [skipZone,  setSkipZone]  = useState<"intro" | "outro" | null>(null);
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
  const [hoverX,      setHoverX]      = useState<number | null>(null);
  const [animeLogo,   setAnimeLogo]   = useState<string | null>(null);

  // ── AI CC (dub only) ──────────────────────────────────────────────────────
  const [aiCcEnabled, setAiCcEnabled] = useState(false);
  const [aiCcText,    setAiCcText]    = useState("");

  // ── Fetch anime logo from TMDB ────────────────────────────────────────────
  useEffect(() => {
    setAnimeLogo(null);
    if (!animeTitle) return;
    let cancelled = false;
    fetch(`/api/anime-logo?title=${encodeURIComponent(animeTitle)}&animeId=${animeId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d: { logo: string | null } | null) => { if (!cancelled && d?.logo) setAnimeLogo(d.logo); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [animeTitle]);

  // ── Persisted prefs ───────────────────────────────────────────────────────
  const captionsOn         = usePlayerPrefsStore((s) => s.captionsOn);
  const captionSize        = usePlayerPrefsStore((s) => s.captionSize);
  const captionColor       = usePlayerPrefsStore((s) => s.captionColor);
  const captionBg          = usePlayerPrefsStore((s) => s.captionBg);
  const captionFont        = usePlayerPrefsStore((s) => s.captionFont);
  const captionShadow      = usePlayerPrefsStore((s) => s.captionShadow);
  const speed              = usePlayerPrefsStore((s) => s.speed);
  const alwaysHD           = usePlayerPrefsStore((s) => s.alwaysHD);
  const volumeBoost        = usePlayerPrefsStore((s) => s.volumeBoost);
  const announcements      = usePlayerPrefsStore((s) => s.announcements);
  const keyboardAnimations = usePlayerPrefsStore((s) => s.keyboardAnimations);
  const setCaptionsOn         = usePlayerPrefsStore((s) => s.setCaptionsOn);
  const setCaptionSize        = usePlayerPrefsStore((s) => s.setCaptionSize);
  const setCaptionColor       = usePlayerPrefsStore((s) => s.setCaptionColor);
  const setCaptionBg          = usePlayerPrefsStore((s) => s.setCaptionBg);
  const setCaptionFont        = usePlayerPrefsStore((s) => s.setCaptionFont);
  const setCaptionShadow      = usePlayerPrefsStore((s) => s.setCaptionShadow);
  const setSpeed              = usePlayerPrefsStore((s) => s.setSpeed);
  const setAlwaysHD           = usePlayerPrefsStore((s) => s.setAlwaysHD);
  const setVolumeBoost        = usePlayerPrefsStore((s) => s.setVolumeBoost);
  const setAnnouncements      = usePlayerPrefsStore((s) => s.setAnnouncements);
  const setKeyboardAnimations = usePlayerPrefsStore((s) => s.setKeyboardAnimations);

  const PLAYER_TYPES = ["plyr", "natv", "vidk"] as const;
  type PlayerType = typeof PLAYER_TYPES[number];
  const [playerType,        setPlayerType]        = useState<PlayerType>("plyr");
  const [selectedTrack,     setSelectedTrack]     = useState(0);
  const [hlsLevels,         setHlsLevels]         = useState<HLSLevel[]>([]);
  const [selectedLevel,     setSelectedLevel]     = useState(-1);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [settingsView,      setSettingsView]      = useState<SettingsView>("main");

  useEffect(() => { speedRef.current = speed; }, [speed]);

  useEffect(() => {
    if (!settingsPanelOpen) setSettingsView("main");
  }, [settingsPanelOpen]);

  // ── Web Audio volume boost ────────────────────────────────────────────────
  function initAudioBoost() {
    const video = videoRef.current;
    if (!video || audioConnectedRef.current) return;
    try {
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const source     = ctx.createMediaElementSource(video);
      const gain       = ctx.createGain();
      const streamDest = ctx.createMediaStreamDestination();
      source.connect(gain);
      gain.connect(ctx.destination);
      gain.connect(streamDest); // for AI CC recording
      audioCtxRef.current       = ctx;
      gainNodeRef.current       = gain;
      streamDestRef.current     = streamDest;
      audioConnectedRef.current = true;
      gain.gain.value = 1 + usePlayerPrefsStore.getState().volumeBoost / 100;
    } catch {
      // Web Audio not available (e.g. iOS restriction) — silently ignore
    }
  }

  useEffect(() => {
    if (!gainNodeRef.current) return;
    gainNodeRef.current.gain.value = 1 + volumeBoost / 100;
  }, [volumeBoost]);

  // ── AI CC recording (dub captions via Groq Whisper) ───────────────────────
  useEffect(() => {
    if (!aiCcEnabled || audio !== "dub") { setAiCcText(""); return; }

    if (!audioConnectedRef.current) initAudioBoost();
    const streamDest = streamDestRef.current;
    if (!streamDest) return;

    let active = true;

    function startBatch() {
      if (!active || !streamDest) return;
      const chunks: Blob[] = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(streamDest.stream, { mimeType });

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        if (!active || chunks.length === 0) return;
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size < 1000) { if (active) setTimeout(startBatch, 200); return; }
        try {
          const form = new FormData();
          form.append("audio", blob, "chunk.webm");
          const res = await fetch("/api/ai-captions", { method: "POST", body: form });
          if (res.ok) {
            const data = await res.json() as { text?: string };
            if (data.text && active) setAiCcText(data.text);
          }
        } catch { /* network error — next chunk will retry */ }
        if (active) setTimeout(startBatch, 200);
      };

      if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume().catch(() => {});
      recorder.start();
      setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 5_000);
    }

    startBatch();
    return () => { active = false; setAiCcText(""); };
  }, [aiCcEnabled, audio]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Always HD ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!alwaysHD || hlsLevels.length === 0) return;
    const highest = hlsLevels[0];
    setSelectedLevel(highest.index);
    const hls = hlsRef.current;
    if (hls) { hls.currentLevel = highest.index; hls.loadLevel = highest.index; }
  }, [alwaysHD, hlsLevels]);

  // ── Caption ::cue style ───────────────────────────────────────────────────
  useEffect(() => {
    const styleId = "bankai-cue-styles";
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) { el = document.createElement("style"); el.id = styleId; document.head.appendChild(el); }
    const pct = parseFloat(captionSize) / 100;
    const shadow = captionShadow ? "0 1px 3px rgba(0,0,0,1), 0 2px 8px rgba(0,0,0,0.9)" : "none";
    el.textContent = `video::cue { font-size:${pct}em; color:${captionColor}; background-color:${captionBg}; font-family:${captionFont}; text-shadow:${shadow}; }`;
  }, [captionSize, captionColor, captionBg, captionFont, captionShadow]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const apply = () => {
      for (let i = 0; i < video.textTracks.length; i++)
        video.textTracks[i].mode = captionsOn && i === selectedTrack ? "showing" : "hidden";
    };
    apply();
    const t = setTimeout(apply, 100);
    video.textTracks.addEventListener("addtrack", apply);
    return () => { clearTimeout(t); video.textTracks.removeEventListener("addtrack", apply); };
  }, [captionsOn, subtitles, selectedTrack]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
  }, [speed]);

  // ── Player initialisation ─────────────────────────────────────────────────
  const initPlayer = useCallback(async () => {
    if (!selectedProvider) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    setEmbedUrl(null); setLoading(true); setError(null);
    setIntro(null); setOutro(null); setSkipZone(null); setSubtitles([]);
    setCurrentTime(0); setDuration(0); setPlaying(false);
    setSelectedTrack(0); setHlsLevels([]); setSelectedLevel(-1); setHoverX(null);
    setAiCcText("");

    try {
      const epId = providersDataRef.current?.[selectedProvider]?.episodes?.[audio]
        ?.find((e) => e.number === episode)?.id;
      const apiUrl = epId
        ? `/api/stream?episodeId=${encodeURIComponent(epId)}`
        : `/api/stream?id=${animeId}&ep=${episode}&provider=${encodeURIComponent(selectedProvider)}&audio=${audio}`;

      const ssKey = `bankai-progress-${animeId}-${episode}`;
      const localProgress = (() => { try { return parseInt(sessionStorage.getItem(ssKey) ?? "0", 10) || 0; } catch { return 0; } })();

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
              }).catch(() => 0)
          : Promise.resolve(0),
      ]);

      const resumeAt = Math.max(localProgress, apiProgress);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json() as {
        stream_url?: string | null; subtitles?: SubtitleTrack[];
        intro?: Timestamp; outro?: Timestamp; error?: string;
      };
      if (data.error) throw new Error(data.error);
      const streamUrl = data.stream_url;
      if (!streamUrl) throw new Error("No stream URL — try another source.");

      if (/^https?:\/\/megaplay\.buzz/i.test(streamUrl)) {
        setEmbedUrl(streamUrl); setLoading(false);
        if (currentUserRef.current) {
          fetch("/api/history", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: currentUserRef.current, animeId: `anilist:${animeId}`,
              episodeNumber: episode, progress: 0, duration: 0, completed: false,
              animeTitle: animeTitleRef.current, animeCover: animeCoverRef.current }) }).catch(() => {});
        }
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      const providerIntro = parseTimestamp(data.intro);
      const providerOutro = parseTimestamp(data.outro);
      if (providerIntro) setIntro(providerIntro);
      if (providerOutro) setOutro(providerOutro);

      if (malId != null && malId > 0) {
        fetch(`/api/skip-times?malId=${malId}&ep=${episode}`, { signal: AbortSignal.timeout(8000) })
          .then((r) => r.ok ? r.json() : null).catch(() => null)
          .then((st: { intro?: Timestamp; outro?: Timestamp } | null) => {
            const ai = parseTimestamp(st?.intro);
            const ao = parseTimestamp(st?.outro);
            if (ai) setIntro(ai);
            if (ao) setOutro(ao);
          });
      }

      if (data.subtitles?.length) {
        setSubtitles(data.subtitles);
      } else if (audio === "dub") {
        const subEpId = providersDataRef.current?.[selectedProvider]?.episodes?.["sub"]
          ?.find((e) => e.number === episode)?.id;
        const subUrl = subEpId
          ? `/api/stream?episodeId=${encodeURIComponent(subEpId)}`
          : `/api/stream?id=${animeId}&ep=${episode}&provider=${encodeURIComponent(selectedProvider)}&audio=sub`;
        fetch(subUrl).then((r) => r.ok ? r.json() : null)
          .then((sd: { subtitles?: SubtitleTrack[] } | null) => { if (sd?.subtitles?.length) setSubtitles(sd.subtitles); })
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
          const byHeight = new Map<number, HLSLevel>();
          hls.levels.forEach((l, i) => {
            const h = l.height || 0;
            const ex = byHeight.get(h);
            if (!ex || l.bitrate > ex.bitrate) byHeight.set(h, { index: i, height: h, bitrate: l.bitrate });
          });
          const sorted = Array.from(byHeight.values()).sort((a, b) => b.height - a.height);
          setHlsLevels(sorted);
          if (usePlayerPrefsStore.getState().alwaysHD && sorted.length > 0) {
            hls.currentLevel = sorted[0].index;
            hls.loadLevel    = sorted[0].index;
            setSelectedLevel(sorted[0].index);
          }
        });
        hls.on(Hls.Events.ERROR, (_e, d) => {
          if (d.fatal) { setError("Playback error — try a different source."); setLoading(false); onErrorRef.current?.(selectedProvider); }
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

  // ── Video events ──────────────────────────────────────────────────────────
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
      if (video.buffered.length && video.duration)
        setBufferedPct((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
    };
    video.addEventListener("play", onPlay); video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded); video.addEventListener("durationchange", onDur);
    video.addEventListener("volumechange", onVolume); video.addEventListener("timeupdate", onTime);
    return () => {
      video.removeEventListener("play", onPlay); video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded); video.removeEventListener("durationchange", onDur);
      video.removeEventListener("volumechange", onVolume); video.removeEventListener("timeupdate", onTime);
    };
  }, []);

  // ── Skip zone detection + auto-skip ──────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handler = () => {
      const t = video.currentTime;
      if      (intro && t >= intro.start && t < intro.end) setSkipZone("intro");
      else if (outro && t >= outro.start && t < outro.end) setSkipZone("outro");
      else setSkipZone(null);
      if (autoSkipRef.current) {
        if (intro && t >= intro.start && t < intro.end) video.currentTime = intro.end;
        else if (outro && t >= outro.start && t < outro.end) video.currentTime = outro.end;
      }
    };
    video.addEventListener("timeupdate", handler);
    return () => video.removeEventListener("timeupdate", handler);
  }, [intro, outro]);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setFullscreen(
      !!document.fullscreenElement || !!(document as unknown as Record<string,unknown>).webkitFullscreenElement
    );
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => { document.removeEventListener("fullscreenchange", onChange); document.removeEventListener("webkitfullscreenchange", onChange); };
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const video = videoRef.current;
      if (!video) return;
      if (e.code === "Space" || e.code === "KeyK") { e.preventDefault(); video.paused ? video.play().catch(() => {}) : video.pause(); }
      if (e.code === "ArrowLeft")  { e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 10); }
      if (e.code === "ArrowRight") { e.preventDefault(); video.currentTime = Math.min(video.duration || 0, video.currentTime + 10); }
      if (e.code === "ArrowUp")    { e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); }
      if (e.code === "ArrowDown")  { e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); }
      if (e.code === "KeyM")       { video.muted = !video.muted; }
      if (e.code === "KeyC")       { setCaptionsOn(!usePlayerPrefsStore.getState().captionsOn); }
      if (e.code === "KeyF")       { e.preventDefault(); toggleFullscreen(); }
      if (e.code === "Comma")      { const i = SPEEDS.indexOf(speedRef.current); setSpeed(SPEEDS[Math.max(0, i - 1)]); }
      if (e.code === "Period")     { const i = SPEEDS.indexOf(speedRef.current); setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, i + 1)]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Progress persistence ──────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let lastSave = 0;
    const ssKey = `bankai-progress-${animeId}-${episode}`;
    function saveProgress(completed = false) {
      if (!video || !video.duration) return;
      const pos = Math.floor(video.currentTime);
      try { sessionStorage.setItem(ssKey, String(pos)); } catch {}
      if (!currentUserRef.current) return;
      const pData = providersDataRef.current;
      const provider = selectedProviderRef.current ?? "";
      const aud = audioRef.current;
      const epData =
        pData?.[provider]?.episodes?.[aud]?.find((e) => e.number === episode) ??
        Object.values(pData ?? {}).flatMap((p) => p.episodes?.[aud] ?? []).find((e) => e.number === episode);
      fetch("/api/history", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUserRef.current, animeId: `anilist:${animeId}`,
          episodeNumber: episode, progress: pos, duration: Math.floor(video.duration), completed,
          episodeThumbnail: epData?.thumbnail ?? epData?.image ?? null,
          animeTitle: animeTitleRef.current, animeCover: animeCoverRef.current }) }).catch(() => {});
    }
    const onTime  = () => { const n = Date.now(); if (n - lastSave > 30000) { lastSave = n; saveProgress(); } };
    const onPause = () => saveProgress();
    const onEnded = () => saveProgress(true);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, [animeId, episode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ───────────────────────────────────────────────────────────────
  function bumpControls() {
    setShowCtrl(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowCtrl(false);
    }, 3000);
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (!audioConnectedRef.current) initAudioBoost();
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume().catch(() => {});
    v.paused ? v.play().catch(() => {}) : v.pause();
  }

  function toggleFullscreen() {
    const el = containerRef.current; const video = videoRef.current;
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
    const bar = progressRef.current; const v = videoRef.current;
    if (!bar || !v || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * v.duration;
  }

  function seekTouch(e: React.TouchEvent) {
    const bar = progressRef.current; const v = videoRef.current;
    if (!bar || !v || !v.duration) return;
    const touch = e.touches[0] ?? e.changedTouches[0];
    if (!touch) return;
    const rect = bar.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width)) * v.duration;
  }

  function handleQualitySelect(levelIndex: number) {
    setSelectedLevel(levelIndex);
    const hls = hlsRef.current;
    if (!hls) return;
    if (levelIndex === -1) { hls.currentLevel = -1; hls.loadLevel = -1; }
    else { hls.currentLevel = levelIndex; hls.loadLevel = levelIndex; }
  }

  function toggleAlwaysHD() {
    const next = !alwaysHD;
    setAlwaysHD(next);
    if (next && hlsLevels.length > 0) handleQualitySelect(hlsLevels[0].index);
    else if (!next) handleQualitySelect(-1);
  }

  function qualityLabel(): string {
    if (selectedLevel === -1) {
      const h = hlsLevels.find(l => l.index === hlsRef.current?.currentLevel)?.height;
      return h ? `Auto (${h}p)` : "Auto";
    }
    const l = hlsLevels.find((l) => l.index === selectedLevel);
    return l?.height ? `${l.height}p` : "Auto";
  }

  function handleScreenshot() {
    const video = videoRef.current; if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
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
    const video = videoRef.current; if (!video) return;
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    else if ((document as unknown as Record<string,unknown>).pictureInPictureEnabled)
      (video as unknown as { requestPictureInPicture: () => Promise<unknown> }).requestPictureInPicture().catch(() => {});
  }

  function setVideoVolume(val: number) {
    const v = videoRef.current; if (!v) return;
    v.volume = val; v.muted = val === 0;
  }

  const progress      = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayVolume = muted ? 0 : volume;

  // ── Shared sub-components (rendered inside the IIFE) ──────────────────────
  return (
    <div className="overflow-hidden rounded-xl bg-black shadow-2xl">
      <div
        ref={containerRef}
        className="relative aspect-video w-full cursor-pointer select-none bg-black"
        onMouseMove={embedUrl ? undefined : bumpControls}
        onMouseLeave={embedUrl ? undefined : () => { if (!videoRef.current?.paused) setShowCtrl(false); }}
        onTouchStart={embedUrl ? undefined : bumpControls}
        onClick={(e) => {
          if (embedUrl) return;
          if ((e.target as HTMLElement).closest("button,input")) return;
          togglePlay(); bumpControls();
        }}
      >
        {/* Poster */}
        {poster && !embedUrl && (
          <img src={poster} alt=""
            className={["pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-500",
              loading ? "opacity-40" : "opacity-0"].join(" ")} />
        )}

        {/* Video */}
        {!embedUrl && (
          <video ref={videoRef} playsInline className="size-full object-contain" style={{ display: error ? "none" : "block" }}>
            {subtitles.map((s, i) => (
              <track key={i} kind={(s.kind as React.ComponentProps<"track">["kind"]) ?? "subtitles"}
                src={s.file} label={s.label ?? "Subtitles"} />
            ))}
          </video>
        )}

        {/* Embed */}
        {embedUrl && (
          <iframe key={embedUrl} src={embedUrl} className="absolute inset-0 size-full border-0"
            allow="fullscreen; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        )}

        {/* Loading: pulsing anime logo */}
        {loading && !embedUrl && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-5">
            {animeLogo ? (
              <img
                src={animeLogo}
                alt={animeTitle ?? ""}
                draggable={false}
                className="animate-pulse max-h-20 max-w-[65%] object-contain drop-shadow-[0_2px_16px_rgba(255,255,255,0.18)] md:max-h-28"
                style={{ animationDuration: "1.4s" }}
              />
            ) : (
              <p className="animate-pulse text-2xl font-extrabold tracking-tight text-white/70 md:text-3xl px-6 text-center"
                style={{ animationDuration: "1.4s" }}>
                {animeTitle ?? "Loading…"}
              </p>
            )}
          </div>
        )}

        {/* AI CC overlay (dub captions) */}
        {aiCcEnabled && aiCcText && captionsOn && !embedUrl && !error && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[4.5rem] z-20 flex justify-center px-8 text-center">
            <span
              className="rounded px-2 py-0.5 leading-relaxed"
              style={{
                fontSize: `${parseFloat(captionSize) / 100}em`,
                color: captionColor,
                backgroundColor: captionBg,
                fontFamily: captionFont === "inherit" ? "inherit" : captionFont,
                textShadow: captionShadow
                  ? "0 1px 3px rgba(0,0,0,1), 0 2px 8px rgba(0,0,0,0.9)"
                  : "none",
              }}
            >
              {aiCcText}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/95 px-6 text-center">
            <div className="rounded-full bg-red-500/10 p-4"><MI name="warning" size={32} className="text-red-400" /></div>
            <div>
              <p className="font-semibold text-white">{error}</p>
              <p className="mt-1 text-sm text-white/40">Try a different server below</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setError(null); setRetryKey((k) => k + 1); }}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors [touch-action:manipulation]">
              <MI name="refresh" size={16} /> Retry
            </button>
          </div>
        )}

        {/* Pause indicator */}
        {!embedUrl && !loading && !error && !playing && duration > 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
              <MI name="play_arrow" size={28} className="translate-x-0.5 text-white" />
            </div>
          </div>
        )}

        {/* Skip buttons */}
        {!embedUrl && !loading && !error && (
          <div className="absolute bottom-20 right-4 z-10 flex flex-col items-end gap-2">
            {intro && currentTime >= intro.start && currentTime < intro.end && (
              <button onClick={(e) => { e.stopPropagation(); if (videoRef.current) videoRef.current.currentTime = intro.end; }}
                className="flex items-center gap-2 rounded-lg border border-amber-700/50 bg-black/85 px-4 py-2.5 text-sm font-bold text-amber-500 shadow-lg backdrop-blur-sm transition-all hover:bg-amber-700/20 active:scale-95 [touch-action:manipulation]">
                <MI name="skip_next" size={16} /> Skip Intro
              </button>
            )}
            {outro && currentTime >= outro.start && currentTime < outro.end && (
              <button onClick={(e) => { e.stopPropagation(); if (videoRef.current) videoRef.current.currentTime = outro.end; }}
                className="flex items-center gap-2 rounded-lg border border-amber-700/50 bg-black/85 px-4 py-2.5 text-sm font-bold text-amber-500 shadow-lg backdrop-blur-sm transition-all hover:bg-amber-700/20 active:scale-95 [touch-action:manipulation]">
                <MI name="skip_next" size={16} /> Skip Outro
              </button>
            )}
          </div>
        )}

        {/* ── Control overlay ───────────────────────────────────────────── */}
        {!embedUrl && !error && (() => {

          /* ── Settings panel (shared across all player types) ──────────── */
          // Back button header row
          function SubHeader({ label, backTo }: { label: string; backTo: SettingsView }) {
            return (
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
                <button onClick={() => setSettingsView(backTo)}
                  className="flex size-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white [touch-action:manipulation]">
                  <MI name="arrow_back" size={16} />
                </button>
                <span className="text-sm font-semibold text-white">{label}</span>
              </div>
            );
          }

          const settingsPanel = settingsPanelOpen ? (
            <div className="absolute bottom-10 right-0 z-30 w-64 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1c1c1c] shadow-2xl">

              {/* ── MAIN ────────────────────────────────────────────────── */}
              {settingsView === "main" && (
                <div className="py-1">
                  {/* Volume Boost */}
                  <button onClick={() => setSettingsView("volumeBoost")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 [touch-action:manipulation]">
                    <MI name="music_note" size={18} className="shrink-0 text-white/50" />
                    <span className="flex-1 text-sm text-white/90">Volume Boost</span>
                    <span className="text-sm text-white/35">{volumeBoost > 0 ? `+${volumeBoost}%` : "0%"}</span>
                    <MI name="chevron_right" size={16} className="shrink-0 text-white/25" filled={false} />
                  </button>
                  <div className="mx-4 border-t border-white/[0.06]" />

                  {/* Accessibility */}
                  <button onClick={() => setSettingsView("accessibility")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 [touch-action:manipulation]">
                    <MI name="accessibility_new" size={18} className="shrink-0 text-white/50" />
                    <span className="flex-1 text-sm text-white/90">Accessibility</span>
                    <MI name="chevron_right" size={16} className="shrink-0 text-white/25" filled={false} />
                  </button>
                  <div className="mx-4 border-t border-white/[0.06]" />

                  {/* Captions */}
                  <button onClick={() => setSettingsView("captions")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 [touch-action:manipulation]">
                    <MI name="closed_caption" size={18} className="shrink-0 text-white/50" />
                    <span className="flex-1 text-sm text-white/90">Captions</span>
                    <span className="text-sm text-white/35">
                      {captionsOn && aiCcEnabled
                        ? "AI CC"
                        : captionsOn && subtitles.length > 0
                          ? subtitles[selectedTrack]?.label ?? "On"
                          : captionsOn ? "On" : "Off"}
                    </span>
                    <MI name="chevron_right" size={16} className="shrink-0 text-white/25" filled={false} />
                  </button>
                  <div className="mx-4 border-t border-white/[0.06]" />

                  {/* Speed */}
                  <button onClick={() => setSettingsView("speed")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 [touch-action:manipulation]">
                    <MI name="speed" size={18} className="shrink-0 text-white/50" />
                    <span className="flex-1 text-sm text-white/90">Speed</span>
                    <span className="text-sm text-white/35">{speed === 1 ? "Normal" : `${speed}x`}</span>
                    <MI name="chevron_right" size={16} className="shrink-0 text-white/25" filled={false} />
                  </button>
                  <div className="mx-4 border-t border-white/[0.06]" />

                  {/* Quality */}
                  <button onClick={() => setSettingsView("quality")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 [touch-action:manipulation]">
                    <MI name="hd" size={18} className="shrink-0 text-white/50" />
                    <span className="flex-1 text-sm text-white/90">Quality</span>
                    <span className="text-sm text-white/35">{qualityLabel()}</span>
                    <MI name="chevron_right" size={16} className="shrink-0 text-white/25" filled={false} />
                  </button>
                </div>
              )}

              {/* ── VOLUME BOOST ─────────────────────────────────────────── */}
              {settingsView === "volumeBoost" && (
                <div>
                  <SubHeader label="Volume Boost" backTo="main" />
                  <div className="px-5 py-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-xs text-white/40">Off</span>
                      <span className={["text-base font-bold tabular-nums", volumeBoost > 0 ? "text-primary" : "text-white/60"].join(" ")}>
                        {volumeBoost > 0 ? `+${volumeBoost}%` : "Off"}
                      </span>
                      <span className="text-xs text-white/40">+200%</span>
                    </div>
                    <input
                      type="range" min={0} max={200} step={10} value={volumeBoost}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setVolumeBoost(v);
                        if (!audioConnectedRef.current) initAudioBoost();
                        if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume().catch(() => {});
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full cursor-pointer accent-primary"
                    />
                    <div className="mt-3 flex justify-between text-[10px] text-white/25">
                      <span>0%</span><span>50%</span><span>100%</span><span>150%</span><span>200%</span>
                    </div>
                    <p className="mt-3 text-xs text-white/30 leading-relaxed">
                      Amplifies audio above 100% using Web Audio. Init on first play.
                    </p>
                  </div>
                </div>
              )}

              {/* ── ACCESSIBILITY ────────────────────────────────────────── */}
              {settingsView === "accessibility" && (
                <div>
                  <SubHeader label="Accessibility" backTo="main" />
                  <div>
                    {/* Announcements */}
                    <div className="flex items-center justify-between px-5 py-4">
                      <span className="text-sm text-white/90">Announcements</span>
                      <PillToggle active={announcements} onClick={() => setAnnouncements(!announcements)} />
                    </div>
                    <div className="mx-5 border-t border-white/[0.06]" />

                    {/* Keyboard Animations */}
                    <div className="flex items-center justify-between px-5 py-4">
                      <span className="text-sm text-white/90">Keyboard Animations</span>
                      <PillToggle active={keyboardAnimations} onClick={() => setKeyboardAnimations(!keyboardAnimations)} />
                    </div>
                    <div className="mx-5 border-t border-white/[0.06]" />

                    {/* Caption Styles → */}
                    <button onClick={() => setSettingsView("captionStyles")}
                      className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/5 [touch-action:manipulation]">
                      <span className="text-sm text-white/90">Caption Styles</span>
                      <MI name="chevron_right" size={16} className="text-white/25" filled={false} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── CAPTION STYLES ───────────────────────────────────────── */}
              {settingsView === "captionStyles" && (
                <div>
                  <SubHeader label="Caption Styles" backTo="accessibility" />
                  <div className="p-3">
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
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {CAPTION_FONTS.map(({ l, v }) => (
                        <button key={l} onClick={() => setCaptionFont(v)}
                          className={["rounded px-2.5 py-1 text-xs font-medium transition-colors [touch-action:manipulation]",
                            captionFont === v ? "bg-primary text-black" : "bg-white/10 text-white/70 hover:bg-white/15"].join(" ")}
                          style={{ fontFamily: v }}>{l}</button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium text-white/35">TEXT SHADOW</p>
                      <PillToggle active={captionShadow} onClick={() => setCaptionShadow(!captionShadow)} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── CAPTIONS: simple track list ──────────────────────────── */}
              {settingsView === "captions" && (
                <div>
                  <SubHeader label="Captions" backTo="main" />
                  <div className="py-1">
                    {/* Off */}
                    <button onClick={() => { setCaptionsOn(false); setAiCcEnabled(false); }}
                      className="flex w-full items-center justify-between px-5 py-2.5 text-sm transition-colors hover:bg-white/5 [touch-action:manipulation]">
                      <span className={!captionsOn ? "font-medium text-white" : "text-white/70"}>Off</span>
                      {!captionsOn && <MI name="check" size={16} className="text-white" />}
                    </button>
                    {/* AI CC for dub */}
                    {audio === "dub" && (
                      <button
                        onClick={() => { setAiCcEnabled(true); setSelectedTrack(-1); setCaptionsOn(true); }}
                        className="flex w-full items-center justify-between px-5 py-2.5 text-sm transition-colors hover:bg-white/5 [touch-action:manipulation]"
                      >
                        <span className="flex items-center gap-2">
                          <span className={aiCcEnabled && captionsOn ? "font-medium text-white" : "text-white/70"}>
                            AI CC (English)
                          </span>
                          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                            Dubtitles
                          </span>
                        </span>
                        {aiCcEnabled && captionsOn && <MI name="check" size={16} className="text-white" />}
                      </button>
                    )}
                    {/* Native tracks */}
                    {subtitles.map((s, i) => (
                      <button key={i} onClick={() => { setSelectedTrack(i); setAiCcEnabled(false); setCaptionsOn(true); }}
                        className="flex w-full items-center justify-between px-5 py-2.5 text-sm transition-colors hover:bg-white/5 [touch-action:manipulation]">
                        <span className={captionsOn && !aiCcEnabled && selectedTrack === i ? "font-medium text-white" : "text-white/70"}>
                          {s.label || "Subtitles"}
                        </span>
                        {captionsOn && !aiCcEnabled && selectedTrack === i && <MI name="check" size={16} className="text-white" />}
                      </button>
                    ))}
                    {audio !== "dub" && subtitles.length === 0 && (
                      <p className="px-5 py-3 text-xs text-white/35">No captions for this episode.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── SPEED: slider ────────────────────────────────────────── */}
              {settingsView === "speed" && (
                <div>
                  <SubHeader label="Speed" backTo="main" />
                  <div className="px-5 py-5">
                    <div className="mb-5 text-center">
                      <span className={["text-2xl font-bold tabular-nums", speed !== 1 ? "text-primary" : "text-white"].join(" ")}>
                        {speed === 1 ? "Normal" : `${speed}x`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0} max={SPEEDS.length - 1} step={1}
                      value={SPEEDS.indexOf(speed) === -1 ? 3 : SPEEDS.indexOf(speed)}
                      onChange={(e) => setSpeed(SPEEDS[parseInt(e.target.value)])}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full cursor-pointer accent-primary"
                    />
                    <div className="mt-2 flex justify-between">
                      {SPEEDS.map((s) => (
                        <span key={s} className={["text-[10px] tabular-nums", s === speed ? "text-primary font-semibold" : "text-white/25"].join(" ")}>
                          {s === 1 ? "1x" : `${s}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── QUALITY ──────────────────────────────────────────────── */}
              {settingsView === "quality" && (
                <div>
                  <SubHeader label="Quality" backTo="main" />
                  {/* Always HD toggle */}
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
                    <div className="flex items-center gap-2">
                      <MI name="hd" size={16} className="text-white/60" />
                      <span className="text-sm text-white/80">Always HD</span>
                    </div>
                    <PillToggle active={alwaysHD} onClick={toggleAlwaysHD} />
                  </div>
                  <div className="py-1">
                    <button onClick={() => handleQualitySelect(-1)}
                      className={["flex w-full items-center justify-between px-5 py-2.5 text-sm transition-colors hover:bg-white/5 [touch-action:manipulation]",
                        selectedLevel === -1 ? "text-primary font-semibold" : "text-white/75"].join(" ")}>
                      <span>Auto</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/30">Recommended</span>
                        {selectedLevel === -1 && <MI name="check" size={16} className="text-primary" />}
                      </div>
                    </button>
                    {hlsLevels.map((l) => (
                      <button key={l.index} onClick={() => handleQualitySelect(l.index)}
                        className={["flex w-full items-center justify-between px-5 py-2.5 text-sm transition-colors hover:bg-white/5 [touch-action:manipulation]",
                          selectedLevel === l.index ? "text-primary font-semibold" : "text-white/75"].join(" ")}>
                        <span>{l.height ? `${l.height}p` : `Q${l.index + 1}`}</span>
                        {selectedLevel === l.index && <MI name="check" size={16} className="text-primary" />}
                      </button>
                    ))}
                    {hlsLevels.length === 0 && (
                      <p className="px-5 py-3 text-xs text-white/35">No quality options yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null;

          /* ── Progress bar drag + hover handlers ─────────────────────── */
          const barHandlers = {
            style: { touchAction: "none" as const },
            onMouseDown: (e: React.MouseEvent) => { scrubbingRef.current = true; seek(e.clientX); },
            onMouseMove: (e: React.MouseEvent) => {
              const bar = progressRef.current;
              if (bar && duration > 0) {
                const rect = bar.getBoundingClientRect();
                setHoverX(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
              }
              if (scrubbingRef.current) seek(e.clientX);
            },
            onMouseLeave: () => { scrubbingRef.current = false; setHoverX(null); },
            onMouseUp:    () => { scrubbingRef.current = false; },
            onTouchStart: (e: React.TouchEvent) => { e.stopPropagation(); scrubbingRef.current = true; seekTouch(e); },
            onTouchMove:  (e: React.TouchEvent) => { if (scrubbingRef.current) { e.preventDefault(); seekTouch(e); } },
            onTouchEnd:   () => { scrubbingRef.current = false; },
          };

          /* ── Timeline tooltip ────────────────────────────────────────── */
          const timelineTooltip = hoverX !== null && duration > 0 ? (() => {
            const hoverTime = (hoverX / 100) * duration;
            const isIntro = !!(intro && hoverTime >= intro.start && hoverTime <= intro.end);
            const isOutro = !!(outro && hoverTime >= outro.start && hoverTime <= outro.end);
            return (
              <div className="pointer-events-none absolute bottom-full z-30 mb-2 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${hoverX}%` }}>
                {(isIntro || isOutro) && (
                  <span className="mb-1 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
                    {isIntro ? "Intro" : "Outro"}
                  </span>
                )}
                <span className="rounded-md bg-black/90 px-2.5 py-1 text-xs font-medium tabular-nums text-white shadow-lg whitespace-nowrap">
                  {fmt(hoverTime)}
                </span>
                <div className="size-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-black/90" />
              </div>
            );
          })() : null;

          /* ── Segmented progress bar ──────────────────────────────────── */
          function renderSegments(fillClass: string) {
            if (duration <= 0) return <div className="absolute inset-y-0 left-0 w-full rounded-[2px] bg-white/20" />;
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
              const lPct = (s / duration) * 100;
              const wPct = (dur / duration) * 100;
              const watchPct = dur > 0 ? Math.max(0, Math.min(100, ((Math.min(currentTime, e) - s) / dur) * 100)) : 0;
              const bufPct   = dur > 0 ? Math.max(0, Math.min(100, ((Math.min(bufTime, e) - s) / dur) * 100)) : 0;
              return (
                <div key={idx} className="absolute inset-y-0 overflow-hidden rounded-[2px]"
                  style={{ left: `calc(${lPct}% + 1.5px)`, width: `calc(${wPct}% - 3px)` }}>
                  <div className={["absolute inset-0", skip ? "bg-white/[0.16]" : "bg-white/[0.32]"].join(" ")} />
                  {bufPct > watchPct && <div className="absolute inset-y-0 left-0 bg-white/40" style={{ width: `${bufPct}%` }} />}
                  {watchPct > 0 && (
                    <div className={["absolute inset-y-0 left-0", skip ? `${fillClass}/70` : fillClass].join(" ")}
                      style={{ width: `${watchPct}%` }} />
                  )}
                </div>
              );
            });
          }

          /* ── Volume control ──────────────────────────────────────────── */
          function VolumeControl({ iconSize = 20, sliderW = "w-20" }: { iconSize?: number; sliderW?: string }) {
            return (
              <div className="group/vol flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); const v = videoRef.current; if (v) v.muted = !v.muted; }}
                  className="flex size-9 shrink-0 items-center justify-center text-white/70 transition-colors hover:text-white [touch-action:manipulation]">
                  <MI name={muted || volume === 0 ? "volume_off" : volume < 0.5 ? "volume_down" : "volume_up"} size={iconSize} />
                </button>
                <div
                  className={`relative h-[3px] ${sliderW} cursor-pointer rounded-full bg-white/20 transition-[height] duration-150 hover:h-1`}
                  onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setVideoVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const el = e.currentTarget as HTMLElement;
                    const onMove = (mv: MouseEvent) => { const r = el.getBoundingClientRect(); setVideoVolume(Math.max(0, Math.min(1, (mv.clientX - r.left) / r.width))); };
                    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  }}
                >
                  <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${displayVolume * 100}%` }} />
                  <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-white shadow-md transition-transform group-hover/vol:scale-100"
                    style={{ left: `${displayVolume * 100}%` }} />
                </div>
              </div>
            );
          }

          const visible = showCtrl || !playing;

          /* ── PLYR ─────────────────────────────────────────────────────── */
          if (playerType === "plyr") return (
            <div className={["absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-14 transition-opacity duration-300",
              visible ? "opacity-100" : "opacity-0 pointer-events-none"].join(" ")}
              onClick={(e) => e.stopPropagation()}>

              {/* Progress bar */}
              <div ref={progressRef} {...barHandlers}
                className="group/bar relative mb-3 h-[5px] cursor-pointer overflow-visible transition-[height] duration-150 hover:h-[9px]">
                {timelineTooltip}
                {renderSegments("bg-white")}
                <div className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-white shadow-lg transition-transform group-hover/bar:scale-100"
                  style={{ left: `${progress}%` }} />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-0.5">
                <button onClick={togglePlay} disabled={loading}
                  className="flex size-9 shrink-0 items-center justify-center text-white transition-opacity disabled:opacity-40 [touch-action:manipulation]">
                  {playing ? <MI name="pause" size={22} /> : <MI name="play_arrow" size={22} />}
                </button>
                <button onClick={onNextEpisode} disabled={totalEpisodes > 0 && episode >= totalEpisodes}
                  className="flex size-9 shrink-0 items-center justify-center text-white/70 transition-colors hover:text-white disabled:opacity-30 [touch-action:manipulation]">
                  <MI name="skip_next" size={20} />
                </button>
                <VolumeControl iconSize={20} sliderW="w-20" />
                <span className="ml-1 shrink-0 text-xs tabular-nums text-white/80">{fmt(currentTime)} / {fmt(duration)}</span>
                <div className="flex-1" />
                <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }}
                  className="flex size-9 shrink-0 items-center justify-center text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                  <MI name="replay_10" size={22} />
                </button>
                <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }}
                  className="flex size-9 shrink-0 items-center justify-center text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                  <MI name="forward_10" size={22} />
                </button>
                <button onClick={handleScreenshot}
                  className="flex size-9 items-center justify-center text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                  <MI name="photo_camera" size={20} />
                </button>
                <button onClick={() => onLightsOffChange(!lightsOff)}
                  className={["flex size-9 items-center justify-center transition-colors [touch-action:manipulation]",
                    lightsOff ? "text-primary" : "text-white/70 hover:text-white"].join(" ")}>
                  <MI name="tv" size={20} />
                </button>
                <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSettingsPanelOpen(false); }}>
                  <button onClick={() => setSettingsPanelOpen((o) => !o)}
                    className={["flex size-9 items-center justify-center transition-colors [touch-action:manipulation]",
                      settingsPanelOpen ? "text-primary" : "text-white/70 hover:text-white"].join(" ")}>
                    <MI name="settings" size={20} />
                  </button>
                  {settingsPanel}
                </div>
                <button onClick={handlePiP}
                  className="flex size-9 items-center justify-center text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                  <MI name="picture_in_picture_alt" size={20} />
                </button>
                <button onClick={toggleFullscreen}
                  className="flex size-9 items-center justify-center text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                  {fullscreen ? <MI name="fullscreen_exit" size={20} /> : <MI name="fullscreen" size={20} />}
                </button>
              </div>
            </div>
          );

          /* ── NATV ─────────────────────────────────────────────────────── */
          if (playerType === "natv") return (
            <div className={["absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-10 transition-opacity duration-300",
              visible ? "opacity-100" : "opacity-0 pointer-events-none"].join(" ")}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <button onClick={togglePlay} disabled={loading}
                  className="flex size-9 shrink-0 items-center justify-center text-white disabled:opacity-40 [touch-action:manipulation]">
                  {playing ? <MI name="pause" size={18} /> : <MI name="play_arrow" size={18} />}
                </button>
                <div ref={progressRef} {...barHandlers}
                  className="group/bar relative h-[9px] flex-1 cursor-pointer overflow-visible transition-[height] duration-150 hover:h-3">
                  {timelineTooltip}
                  {renderSegments("bg-primary")}
                  <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg transition-all group-hover/bar:size-3.5"
                    style={{ left: `${progress}%` }} />
                </div>
                <span className="shrink-0 text-xs tabular-nums text-white/80">{fmtRemaining(currentTime, duration)}</span>
                <VolumeControl iconSize={18} sliderW="w-16" />
                <button onClick={() => setCaptionsOn(!captionsOn)}
                  className={["flex size-9 items-center justify-center transition-colors [touch-action:manipulation]",
                    captionsOn ? "text-primary" : "text-white/40 hover:text-white/70"].join(" ")}>
                  {captionsOn ? <MI name="closed_caption" size={18} /> : <MI name="closed_caption_disabled" size={18} />}
                </button>
                <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSettingsPanelOpen(false); }}>
                  <button onClick={() => setSettingsPanelOpen((o) => !o)}
                    className={["flex size-9 items-center justify-center transition-colors [touch-action:manipulation]",
                      settingsPanelOpen ? "text-primary" : "text-white/70 hover:text-white"].join(" ")}>
                    <MI name="settings" size={18} />
                  </button>
                  {settingsPanel}
                </div>
                <button onClick={toggleFullscreen}
                  className="flex size-9 items-center justify-center text-white/70 hover:text-white transition-colors [touch-action:manipulation]">
                  {fullscreen ? <MI name="fullscreen_exit" size={18} /> : <MI name="fullscreen" size={18} />}
                </button>
              </div>
            </div>
          );

          /* ── VIDK ─────────────────────────────────────────────────────── */
          return (
            <div className={["absolute inset-x-0 bottom-0 transition-opacity duration-300",
              visible ? "opacity-100" : "opacity-0 pointer-events-none"].join(" ")}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2.5 bg-gradient-to-t from-black/80 to-transparent px-3 pb-1.5 pt-8">
                <button onClick={togglePlay} disabled={loading}
                  className="flex size-9 shrink-0 items-center justify-center text-white disabled:opacity-40 [touch-action:manipulation]">
                  {playing ? <MI name="pause" size={20} /> : <MI name="play_arrow" size={20} />}
                </button>
                <span className="text-[13px] tabular-nums text-white/90">{fmt(currentTime)} / {fmt(duration)}</span>
                <div className="flex-1" />
                <VolumeControl iconSize={20} sliderW="w-16" />
                <button onClick={toggleFullscreen}
                  className="flex size-9 shrink-0 items-center justify-center text-white/80 hover:text-white transition-colors [touch-action:manipulation]">
                  {fullscreen ? <MI name="fullscreen_exit" size={20} /> : <MI name="fullscreen" size={20} />}
                </button>
                <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSettingsPanelOpen(false); }}>
                  <button onClick={() => setSettingsPanelOpen((o) => !o)}
                    className="flex size-9 shrink-0 items-center justify-center text-white/80 hover:text-white transition-colors [touch-action:manipulation]">
                    <MI name="more_vert" size={20} />
                  </button>
                  {settingsPanel}
                </div>
              </div>
              <div ref={progressRef} {...barHandlers}
                className="group/bar relative h-[3px] w-full cursor-pointer bg-white/25 transition-[height] duration-150 hover:h-1">
                {timelineTooltip}
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
                <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-white shadow transition-transform group-hover/bar:scale-100"
                  style={{ left: `${progress}%` }} />
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Bottom settings bar ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/[0.05] bg-[#111] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-4">
          <Toggle label="Autoplay"  active={autoplay}  onClick={() => onAutoplayChange(!autoplay)} />
          <Toggle label="Auto Skip" active={autoSkip}  accent onClick={() => onAutoSkipChange(!autoSkip)} />
          <Toggle label="Auto Next" active={autoNext}  onClick={() => onAutoNextChange(!autoNext)} />
          <Toggle label="Lights Off" active={lightsOff} onClick={() => onLightsOffChange(!lightsOff)} />
          <button
            onClick={() => { const idx = PLAYER_TYPES.indexOf(playerType); setPlayerType(PLAYER_TYPES[(idx + 1) % PLAYER_TYPES.length]); }}
            className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white/70 transition-colors hover:bg-white/15 hover:text-white [touch-action:manipulation]"
          >
            <MI name="play_arrow" size={10} className="text-white/70" />
            {playerType}
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <button onClick={onPrevEpisode} disabled={episode <= 1}
            className="flex items-center gap-1 text-white/50 transition-colors hover:text-white disabled:opacity-25 [touch-action:manipulation]">
            <MI name="skip_previous" size={14} /> Prev
          </button>
          <span className="text-white/25">|</span>
          <button onClick={onNextEpisode} disabled={totalEpisodes > 0 && episode >= totalEpisodes}
            className="flex items-center gap-1 text-white/50 transition-colors hover:text-white disabled:opacity-25 [touch-action:manipulation]">
            Ep {episode + 1} <MI name="skip_next" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
