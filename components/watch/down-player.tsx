"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AlertTriangle, Loader2, RefreshCw, ChevronDown, Play, SkipBack, SkipForward } from "lucide-react";
import Hls from "hls.js";
import { useAuthStore } from "@/store/auth-store";
import {
  firstAvailableProvider,
  hasAudio,
  providerLabel,
  type EpisodesMap,
} from "./episode-utils";

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

function ControlToggle({
  label,
  active,
  accent,
  onClick,
}: {
  label: string;
  active: boolean;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center gap-1.5 whitespace-nowrap text-xs font-medium transition-colors",
        active && accent
          ? "text-primary"
          : active
          ? "text-white"
          : "text-white/45 hover:text-white/70",
      ].join(" ")}
    >
      <span
        className={[
          "size-3 shrink-0 rounded-[2px] border transition-colors",
          active && accent
            ? "border-primary bg-primary"
            : active
            ? "border-white bg-white"
            : "border-white/30",
        ].join(" ")}
      />
      {label}
    </button>
  );
}

export function DownPlayer({
  poster,
  animeId,
  episode = 1,
  totalEpisodes = 0,
  providersData,
  selectedProvider,
  audio,
  onProviderChange,
  onAudioChange,
  autoplay,
  autoNext,
  autoSkip,
  lightsOff,
  onAutoplayChange,
  onAutoNextChange,
  onAutoSkipChange,
  onLightsOffChange,
  onPrevEpisode,
  onNextEpisode,
  onEpisodeEnd,
  onError,
}: DownPlayerProps) {
  const videoRef    = useRef<HTMLVideoElement | null>(null);
  const hlsRef      = useRef<Hls | null>(null);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [retryKey, setRetryKey]     = useState(0);
  const [paused, setPaused]         = useState(true);
  const [providerOpen, setProviderOpen] = useState(false);

  // Available providers for the current episode + audio
  const availableProviders = providersData
    ? Object.entries(providersData)
        .filter(([, d]) => !d.error && (d.episodes?.[audio] ?? []).some((e) => e.number === episode))
        .map(([n]) => n)
    : [];

  const hasSub = providersData ? hasAudio(providersData, "sub", episode) : false;
  const hasDub = providersData ? hasAudio(providersData, "dub", episode) : false;

  // Load stream when provider/audio/episode/retryKey changes
  const initPlayer = useCallback(async () => {
    if (!selectedProvider) return;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    setLoading(true);
    setError(null);
    setPaused(true);

    try {
      const res = await fetch(
        `/api/stream?id=${animeId}&ep=${episode}&provider=${encodeURIComponent(selectedProvider)}&audio=${audio}`
      );
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json() as Record<string, unknown>;
      if (data.error) throw new Error(data.error as string);

      const streamUrl = data.stream_url as string | undefined;
      if (!streamUrl) throw new Error("No stream URL — try another source.");

      const video = videoRef.current;
      if (!video) return;

      if (Hls.isSupported()) {
        const hls = new Hls({ maxMaxBufferLength: 30 });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          if (autoplay) {
            video.play().then(() => setPaused(false)).catch(() => {});
          }
          if (currentUser) {
            fetch("/api/history", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: currentUser,
                animeId: `anilist:${animeId}`,
                episodeNumber: episode,
                progress: 0,
                duration: 0,
                completed: false,
              }),
            }).catch(() => {});
          }
        });

        hls.on(Hls.Events.ERROR, (_ev, d) => {
          if (d.fatal) {
            setError("Playback error — try a different source.");
            setLoading(false);
            if (selectedProvider) onError?.(selectedProvider);
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
        video.onloadedmetadata = () => {
          setLoading(false);
          if (autoplay) video.play().then(() => setPaused(false)).catch(() => {});
        };
      } else {
        throw new Error("Your browser does not support HLS playback.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Streaming is unavailable.");
      setLoading(false);
      if (selectedProvider) onError?.(selectedProvider);
    }
  }, [animeId, episode, selectedProvider, audio, autoplay, currentUser, onError]);

  useEffect(() => {
    initPlayer();
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [initPlayer, retryKey]);

  // Auto-skip intro (~1:30) if enabled
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoSkip) return;
    const handler = () => {
      if (video.currentTime > 5 && video.currentTime < 120) {
        video.currentTime = 90;
      }
    };
    video.addEventListener("timeupdate", handler, { once: true });
    return () => video.removeEventListener("timeupdate", handler);
  }, [autoSkip, episode, selectedProvider]);

  // Episode end → auto next
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onEpisodeEnd) return;
    const handler = () => onEpisodeEnd();
    video.addEventListener("ended", handler);
    return () => video.removeEventListener("ended", handler);
  }, [onEpisodeEnd]);

  // Play/pause state sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay  = () => setPaused(false);
    const onPause = () => setPaused(true);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => { video.removeEventListener("play", onPlay); video.removeEventListener("pause", onPause); };
  }, []);

  function handleAudioChange(a: "sub" | "dub") {
    onAudioChange(a);
    if (providersData) {
      const next = firstAvailableProvider(providersData, a, episode);
      onProviderChange(next);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl bg-black shadow-2xl">
      {/* ── Video ──────────────────────────────────────────────────────────── */}
      <div className="relative aspect-video w-full">
        {poster && !error && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className={[
              "absolute inset-0 size-full object-cover transition-opacity duration-500",
              loading ? "opacity-30" : "opacity-0 pointer-events-none",
            ].join(" ")}
          />
        )}

        <video
          ref={videoRef}
          controls
          playsInline
          className={["size-full object-contain", loading || error ? "invisible" : "visible"].join(" ")}
        />

        {/* Paused / loading play button */}
        {(paused || loading) && !error && (
          <div
            className="absolute inset-0 flex cursor-pointer items-center justify-center"
            onClick={() => {
              const v = videoRef.current;
              if (!v || loading) return;
              v.paused ? v.play() : v.pause();
            }}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-10 animate-spin text-white drop-shadow-lg" />
                <p className="text-sm font-medium text-white/80 drop-shadow">
                  Loading episode {episode}…
                </p>
              </div>
            ) : (
              <div className="grid size-16 place-items-center rounded-full bg-black/60 ring-2 ring-white/30 backdrop-blur-sm transition-transform hover:scale-110">
                <Play className="size-7 fill-white text-white" />
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
            <AlertTriangle className="size-8 text-amber-400" />
            <p className="max-w-xs text-sm font-medium text-white">{error}</p>
            {availableProviders.length > 1 && (
              <p className="text-xs text-white/50">Try switching to a different source below.</p>
            )}
            <button
              onClick={() => { setError(null); setRetryKey((k) => k + 1); }}
              className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
            >
              <RefreshCw className="size-4" />
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* ── Custom control bar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/8 bg-[#141414] px-4 py-2.5">
        {/* Left: toggles */}
        <div className="flex flex-wrap items-center gap-4">
          <ControlToggle label="Autoplay"  active={autoplay}  onClick={() => onAutoplayChange(!autoplay)} />
          <ControlToggle label="Auto Skip" active={autoSkip}  accent onClick={() => onAutoSkipChange(!autoSkip)} />
          <ControlToggle label="Auto Next" active={autoNext}  onClick={() => onAutoNextChange(!autoNext)} />

          <button className="text-xs font-medium text-white/45 transition-colors hover:text-white/70">
            ⌘ Shortcuts
          </button>

          <button
            onClick={() => onLightsOffChange(!lightsOff)}
            className={[
              "text-xs font-medium transition-colors",
              lightsOff ? "text-primary" : "text-white/45 hover:text-white/70",
            ].join(" ")}
          >
            ☽ Lights Off
          </button>

          {/* Source picker */}
          {(hasSub || hasDub || availableProviders.length > 0) && (
            <div
              className="relative"
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setProviderOpen(false); }}
            >
              <button
                onClick={() => setProviderOpen((o) => !o)}
                className="flex items-center gap-1 text-xs font-medium text-white/45 transition-colors hover:text-white/70"
              >
                {selectedProvider ? providerLabel(selectedProvider) : "Source"}
                <ChevronDown className="size-3" />
              </button>

              {providerOpen && (
                <div className="absolute bottom-7 left-0 z-30 min-w-[160px] overflow-hidden rounded-lg border border-white/12 bg-[#1c1c1c] shadow-2xl">
                  {/* Sub/Dub */}
                  {(hasSub || hasDub) && (
                    <div className="flex border-b border-white/10">
                      {(["sub", "dub"] as const).map((a) => {
                        const av = a === "sub" ? hasSub : hasDub;
                        return (
                          <button
                            key={a}
                            disabled={!av}
                            onClick={() => { handleAudioChange(a); }}
                            className={[
                              "flex-1 py-1.5 text-xs font-semibold uppercase transition-colors",
                              audio === a
                                ? "bg-primary/15 text-primary"
                                : av
                                ? "text-white/60 hover:text-white"
                                : "cursor-not-allowed text-white/20",
                            ].join(" ")}
                          >
                            {a}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Provider list */}
                  <div className="py-1">
                    {availableProviders.map((name) => (
                      <button
                        key={name}
                        onClick={() => { onProviderChange(name); setProviderOpen(false); }}
                        className={[
                          "flex w-full items-center px-3.5 py-2 text-left text-xs transition-colors hover:bg-white/5",
                          name === selectedProvider ? "text-primary" : "text-white/75",
                        ].join(" ")}
                      >
                        {providerLabel(name)}
                      </button>
                    ))}
                    {availableProviders.length === 0 && (
                      <p className="px-3.5 py-2 text-xs text-white/35">No sources yet…</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Prev / Next episode */}
        <div className="flex items-center gap-3 text-xs font-medium">
          <button
            onClick={onPrevEpisode}
            disabled={episode <= 1}
            className="flex items-center gap-1 text-white/55 transition-colors hover:text-white disabled:opacity-25"
          >
            <SkipBack className="size-3.5" />
            Prev
          </button>

          <span className="text-white/30">|</span>

          <button
            onClick={onNextEpisode}
            disabled={totalEpisodes > 0 && episode >= totalEpisodes}
            className="flex items-center gap-1 text-white/55 transition-colors hover:text-white disabled:opacity-25"
          >
            Episode {episode + 1}
            <SkipForward className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
