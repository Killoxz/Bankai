"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Loader2, AlertTriangle, RefreshCw, SkipBack, SkipForward,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { firstAvailableProvider, providerLabel, type EpisodesMap } from "./episode-utils";

interface Timestamp     { start: number; end: number }
interface SubtitleTrack { file: string; label?: string; kind?: string }

interface DownPlayerProps {
  poster?: string;
  animeId: number;
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

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function Toggle({ label, active, accent, onClick }: {
  label: string; active: boolean; accent?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 whitespace-nowrap text-xs font-medium text-white/50 transition-colors hover:text-white/80"
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

export function DownPlayer({
  poster, animeId, episode = 1, totalEpisodes = 0,
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

  useEffect(() => { autoplayRef.current         = autoplay;         }, [autoplay]);
  useEffect(() => { autoSkipRef.current         = autoSkip;         }, [autoSkip]);
  useEffect(() => { onErrorRef.current          = onError;          }, [onError]);
  useEffect(() => { onEpisodeEndRef.current     = onEpisodeEnd;     }, [onEpisodeEnd]);
  useEffect(() => { currentUserRef.current      = currentUser;      }, [currentUser]);
  useEffect(() => { providersDataRef.current    = providersData;    }, [providersData]);
  useEffect(() => { selectedProviderRef.current = selectedProvider; }, [selectedProvider]);
  useEffect(() => { audioRef.current            = audio;            }, [audio]);

  // ── Stream state ──────────────────────────────────────────────────────────
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
  const [sourceOpen,  setSourceOpen]  = useState(false);

  const availableProviders = providersData
    ? Object.entries(providersData)
        .filter(([, d]) => !d.error && (d.episodes?.[audio] ?? []).some((e) => e.number === episode))
        .map(([n]) => n)
    : [];

  // ── Player initialisation ─────────────────────────────────────────────────
  // providersData is intentionally NOT in deps — it's read via ref so that
  // loading providers doesn't tear down and restart the player.
  const initPlayer = useCallback(async () => {
    if (!selectedProvider) return;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    setError(null);
    setIntro(null);
    setOutro(null);
    setSkipZone(null);
    setSubtitles([]);
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);

    try {
      const epId = providersDataRef.current?.[selectedProvider]?.episodes?.[audio]
        ?.find((e) => e.number === episode)?.id;

      const apiUrl = epId
        ? `/api/stream?episodeId=${encodeURIComponent(epId)}`
        : `/api/stream?id=${animeId}&ep=${episode}&provider=${encodeURIComponent(selectedProvider)}&audio=${audio}`;

      // Fetch stream + saved progress in parallel
      const [res, resumeAt] = await Promise.all([
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

      if (data.intro)             setIntro(data.intro);
      if (data.outro)             setOutro(data.outro);
      if (data.subtitles?.length) setSubtitles(data.subtitles);

      if (Hls.isSupported()) {
        const hls = new Hls({ maxMaxBufferLength: 30 });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          if (resumeAt > 0) video.currentTime = resumeAt;
          if (autoplayRef.current) video.play().catch(() => {});
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
  }, [animeId, episode, selectedProvider, audio]); // ← providersData intentionally absent

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

  // Skip zone + auto-skip on timeupdate
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handler = () => {
      const t = video.currentTime;
      if      (intro && t >= intro.start && t < intro.end) setSkipZone("intro");
      else if (outro && t >= outro.start && t < outro.end) setSkipZone("outro");
      else setSkipZone(null);
      if (autoSkipRef.current && intro && t >= intro.start && t < intro.end) {
        video.currentTime = intro.end;
      }
    };
    video.addEventListener("timeupdate", handler);
    return () => video.removeEventListener("timeupdate", handler);
  }, [intro, outro]);

  // Fullscreen change — covers both standard and webkit (iOS Safari)
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

  // Keyboard shortcuts (videoRef and containerRef are stable — no deps needed)
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
      if (e.code === "KeyF") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist watch progress ────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let lastSave = 0;

    function saveProgress(completed = false) {
      if (!currentUserRef.current || !video || !video.duration) return;
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
          username: currentUserRef.current,
          animeId: `anilist:${animeId}`,
          episodeNumber: episode,
          progress: Math.floor(video.currentTime),
          duration: Math.floor(video.duration),
          completed,
          episodeThumbnail: thumbnail,
        }),
      }).catch(() => {});
    }

    const onTime   = () => { const n = Date.now(); if (n - lastSave > 30000) { lastSave = n; saveProgress(); } };
    const onPause  = () => saveProgress();
    const onEnded  = () => saveProgress(true);

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
      // iOS Safari — only video element supports fullscreen
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

  function handleAudioChange(a: "sub" | "dub") {
    onAudioChange(a);
    if (providersData) onProviderChange(firstAvailableProvider(providersData, a, episode));
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="overflow-hidden rounded-xl bg-black shadow-2xl">

      {/* ── Video container ───────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full cursor-pointer select-none bg-black"
        onMouseMove={bumpControls}
        onMouseLeave={() => { if (!videoRef.current?.paused) setShowCtrl(false); }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button,input")) return;
          togglePlay();
          bumpControls();
        }}
      >
        {/* Poster */}
        {poster && (
          <img
            src={poster} alt=""
            className={[
              "pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-500",
              loading ? "opacity-50" : "opacity-0",
            ].join(" ")}
          />
        )}

        {/* Video */}
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
              default={i === 0}
            />
          ))}
        </video>

        {/* Loading */}
        {loading && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-12 animate-spin text-white/80" />
            <p className="text-sm font-medium text-white/50">Loading episode {episode}…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/95 px-6 text-center">
            <div className="rounded-full bg-red-500/10 p-4">
              <AlertTriangle className="size-8 text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-white">{error}</p>
              <p className="mt-1 text-sm text-white/40">Try a different server below</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setError(null); setRetryKey((k) => k + 1); }}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        {/* Centre pause indicator */}
        {!loading && !error && !playing && duration > 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
              <Play className="size-7 translate-x-0.5 text-white" fill="white" />
            </div>
          </div>
        )}

        {/* Skip intro/outro — visible whenever timestamp data exists, not just when inside the zone */}
        {!loading && !error && (
          <div className="absolute bottom-20 right-4 z-10 flex flex-col items-end gap-2">
            {intro && currentTime < intro.end && (
              <button
                onClick={(e) => { e.stopPropagation(); if (videoRef.current) videoRef.current.currentTime = intro.end; }}
                className="rounded-lg border border-white/25 bg-black/80 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Skip Intro →
              </button>
            )}
            {outro && currentTime >= Math.max(0, outro.start - 30) && currentTime < outro.end && (
              <button
                onClick={(e) => { e.stopPropagation(); if (videoRef.current) videoRef.current.currentTime = outro.end; }}
                className="rounded-lg border border-white/25 bg-black/80 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Skip Outro →
              </button>
            )}
          </div>
        )}

        {/* ── Custom control overlay ───────────────────────────────────────── */}
        {!error && (
          <div
            className={[
              "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-16 transition-opacity duration-300",
              showCtrl || !playing ? "opacity-100" : "opacity-0 pointer-events-none",
            ].join(" ")}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div
              ref={progressRef}
              className="group/bar relative mb-3 h-1 cursor-pointer rounded-full bg-white/20 transition-all duration-150 hover:h-2"
              onMouseDown={(e) => { scrubbingRef.current = true; seek(e.clientX); }}
              onMouseMove={(e) => { if (scrubbingRef.current) seek(e.clientX); }}
              onMouseUp={   () => { scrubbingRef.current = false; }}
              onMouseLeave={ () => { scrubbingRef.current = false; }}
            >
              {/* Buffered track */}
              <div className="absolute inset-y-0 left-0 rounded-full bg-white/20 transition-all"
                style={{ width: `${bufferedPct}%` }} />
              {/* Played track */}
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }} />
              {/* Thumb */}
              <div
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-white shadow-lg transition-transform group-hover/bar:scale-100"
                style={{ left: `${progress}%` }}
              />
            </div>

            {/* Bottom row */}
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                disabled={loading}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 disabled:opacity-40"
              >
                {playing
                  ? <Pause className="size-4" fill="white" />
                  : <Play  className="size-4 translate-x-px" fill="white" />}
              </button>

              {/* Rewind / Forward */}
              <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }}
                className="text-white/70 hover:text-white transition-colors" title="-10s">
                <SkipBack className="size-4" />
              </button>
              <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }}
                className="text-white/70 hover:text-white transition-colors" title="+10s">
                <SkipForward className="size-4" />
              </button>

              {/* Time */}
              <span className="shrink-0 text-xs tabular-nums text-white/60">
                {fmt(currentTime)} / {fmt(duration)}
              </span>

              <div className="flex-1" />

              {/* Volume */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { const v = videoRef.current; if (v) v.muted = !v.muted; }}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  {muted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const v = videoRef.current;
                    if (!v) return;
                    const val = parseFloat(e.target.value);
                    v.volume = val;
                    v.muted  = val === 0;
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-16 cursor-pointer accent-primary"
                />
              </div>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors">
                {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Settings bar below video ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/8 bg-[#111] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-4">
          <Toggle label="Autoplay"  active={autoplay}  onClick={() => onAutoplayChange(!autoplay)} />
          <Toggle label="Auto Skip" active={autoSkip}  accent onClick={() => onAutoSkipChange(!autoSkip)} />
          <Toggle label="Auto Next" active={autoNext}  onClick={() => onAutoNextChange(!autoNext)} />
          <button
            onClick={() => onLightsOffChange(!lightsOff)}
            className="flex items-center gap-2 whitespace-nowrap text-xs font-medium text-white/50 transition-colors hover:text-white/80"
          >
            <span className={["relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors duration-200",
              lightsOff ? "bg-primary" : "bg-white/15"].join(" ")}>
              <span className={["absolute size-2.5 rounded-full bg-white shadow transition-transform duration-200",
                lightsOff ? "translate-x-[11px]" : "translate-x-[1px]"].join(" ")} />
            </span>
            Lights Off
          </button>

          {/* Source picker */}
          {availableProviders.length > 0 && (
            <div className="relative"
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSourceOpen(false); }}>
              <button
                onClick={() => setSourceOpen((o) => !o)}
                className="text-xs font-medium text-white/40 transition-colors hover:text-white/70"
              >
                {selectedProvider ? providerLabel(selectedProvider) : "Source"} ▾
              </button>
              {sourceOpen && (
                <div className="absolute bottom-8 left-0 z-30 min-w-[150px] overflow-hidden rounded-lg border border-white/8 bg-[#1a1a1a] shadow-2xl">
                  <div className="flex border-b border-white/10">
                    {(["sub", "dub"] as const).map((a) => (
                      <button key={a} onClick={() => handleAudioChange(a)}
                        className={["flex-1 py-1.5 text-xs font-semibold uppercase transition-colors",
                          audio === a ? "bg-primary/15 text-primary" : "text-white/55 hover:text-white"].join(" ")}>
                        {a}
                      </button>
                    ))}
                  </div>
                  <div className="py-1">
                    {availableProviders.map((name) => (
                      <button key={name}
                        onClick={() => { onProviderChange(name); setSourceOpen(false); }}
                        className={["flex w-full items-center px-3.5 py-2 text-left text-xs transition-colors hover:bg-white/5",
                          name === selectedProvider ? "text-primary" : "text-white/75"].join(" ")}>
                        {providerLabel(name)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Prev / Next episode */}
        <div className="flex items-center gap-3 text-xs font-medium">
          <button onClick={onPrevEpisode} disabled={episode <= 1}
            className="flex items-center gap-1 text-white/50 transition-colors hover:text-white disabled:opacity-25">
            <SkipBack className="size-3.5" /> Prev
          </button>
          <span className="text-white/25">|</span>
          <button onClick={onNextEpisode}
            disabled={totalEpisodes > 0 && episode >= totalEpisodes}
            className="flex items-center gap-1 text-white/50 transition-colors hover:text-white disabled:opacity-25">
            Ep {episode + 1} <SkipForward className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
