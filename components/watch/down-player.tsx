"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AlertTriangle, Loader2, RefreshCw, ChevronDown } from "lucide-react";
import Hls from "hls.js";
import { useAuthStore } from "@/store/auth-store";

// ─── Anivexa episode/provider types ─────────────────────────────────────────

interface ProviderEpisode {
  id: string;       // "watch/reanime/21/sub/reanime-1"
  number: number;
  title?: string;
  thumbnail?: string;
}

interface ProviderData {
  provider?: string;
  episodes?: {
    sub?: ProviderEpisode[];
    dub?: ProviderEpisode[];
  };
  error?: string;
}

type EpisodesMap = Record<string, ProviderData>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  allmanga:   "AllManga",
  reanime:    "Reanime",
  anikoto:    "AniKoto",
  animegg:    "AnimeGG",
  anineko:    "AniNeko",
  anidbapp:   "AniDB App",
  "2dhive":   "2DHive",
  animenosub: "AnimeNoSub",
  anizone:    "AniZone",
  anibd:      "Anibd",
  senshi:     "Senshi",
  kaa:        "KickAss",
  animedunya: "AnimeDunya",
};

function providerLabel(name: string): string {
  return PROVIDER_LABELS[name] ?? name;
}

function parseProviders(raw: Record<string, unknown>): EpisodesMap {
  const result: EpisodesMap = {};
  for (const [key, val] of Object.entries(raw)) {
    if (key === "mappings" || key === "page" || key === "type" || key === "_unknownProviders") continue;
    if (typeof val !== "object" || val === null) continue;
    const v = val as Record<string, unknown>;
    if (v.episodes && typeof v.episodes === "object") {
      result[key] = v as ProviderData;
    }
  }
  return result;
}

function findEpisode(
  providers: EpisodesMap,
  provider: string,
  audio: "sub" | "dub",
  episodeNumber: number
): ProviderEpisode | null {
  const p = providers[provider];
  if (!p?.episodes) return null;
  const list = p.episodes[audio] ?? [];
  return list.find((e) => e.number === episodeNumber) ?? null;
}

function firstAvailableProvider(
  providers: EpisodesMap,
  audio: "sub" | "dub",
  episodeNumber: number
): string | null {
  for (const [name, data] of Object.entries(providers)) {
    if (data.error) continue;
    const list = data.episodes?.[audio] ?? [];
    if (list.some((e) => e.number === episodeNumber)) return name;
  }
  return null;
}

function hasAudio(providers: EpisodesMap, audio: "sub" | "dub", episodeNumber: number): boolean {
  return Object.values(providers).some(
    (p) => !p.error && (p.episodes?.[audio] ?? []).some((e) => e.number === episodeNumber)
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

interface DownPlayerProps {
  poster?: string;
  animeId: number;
  episode?: number;
}

export function DownPlayer({ poster, animeId, episode = 1 }: DownPlayerProps) {
  const videoRef    = useRef<HTMLVideoElement | null>(null);
  const hlsRef      = useRef<Hls | null>(null);
  const currentUser = useAuthStore((s) => s.currentUser);

  // Episode data from Anivexa
  const [providers, setProviders] = useState<EpisodesMap | null>(null);
  const [epLoading, setEpLoading] = useState(true);
  const [epError, setEpError]     = useState<string | null>(null);

  // Selected source
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [audio, setAudio]                       = useState<"sub" | "dub">("sub");
  const [providerOpen, setProviderOpen]          = useState(false);

  // Player state
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Step 1: Fetch episodes data for this anime
  useEffect(() => {
    let cancelled = false;
    setEpLoading(true);
    setEpError(null);
    setProviders(null);
    setSelectedProvider(null);

    fetch(`/api/episodes/${animeId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Episodes API returned ${r.status}`);
        return r.json();
      })
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseProviders(raw as Record<string, unknown>);
        setProviders(parsed);
        // Auto-pick first available provider for this episode + sub
        const first = firstAvailableProvider(parsed, "sub", episode)
          ?? firstAvailableProvider(parsed, "dub", episode);
        if (first) {
          setSelectedProvider(first);
          const hasSub = hasAudio(parsed, "sub", episode);
          if (!hasSub) setAudio("dub");
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setEpError(e instanceof Error ? e.message : "Failed to load episode sources.");
        }
      })
      .finally(() => {
        if (!cancelled) setEpLoading(false);
      });

    return () => { cancelled = true; };
  }, [animeId, episode]);

  // When provider/audio changes due to episode change, re-pick best provider
  useEffect(() => {
    if (!providers || selectedProvider) return;
    const first = firstAvailableProvider(providers, audio, episode)
      ?? firstAvailableProvider(providers, audio === "sub" ? "dub" : "sub", episode);
    if (first) setSelectedProvider(first);
  }, [providers, episode, audio, selectedProvider]);

  // Step 2: Load stream whenever provider/audio/episode/retryKey changes
  const initPlayer = useCallback(async () => {
    if (!selectedProvider) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/stream?id=${animeId}&ep=${episode}&provider=${encodeURIComponent(selectedProvider)}&audio=${audio}`
      );
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json() as Record<string, unknown>;
      if (data.error) throw new Error(data.error as string);

      const streamUrl = data.stream_url as string | undefined;
      if (!streamUrl) throw new Error("No stream URL returned — try another source.");

      const video = videoRef.current;
      if (!video) return;

      if (Hls.isSupported()) {
        const hls = new Hls({ maxMaxBufferLength: 30 });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          video.play().catch(() => {});
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
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
        video.addEventListener("loadedmetadata", () => {
          setLoading(false);
          video.play().catch(() => {});
        });
      } else {
        throw new Error("Your browser does not support HLS playback.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Streaming is unavailable.");
      setLoading(false);
    }
  }, [animeId, episode, selectedProvider, audio, currentUser]);

  useEffect(() => {
    initPlayer();
    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [initPlayer, retryKey]);

  // ── Build provider list for current episode + audio ──────────────────────
  const availableProviders = providers
    ? Object.entries(providers)
        .filter(([, data]) => !data.error && (data.episodes?.[audio] ?? []).some((e) => e.number === episode))
        .map(([name]) => name)
    : [];

  const hasSub = providers ? hasAudio(providers, "sub", episode) : false;
  const hasDub = providers ? hasAudio(providers, "dub", episode) : false;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {/* Source bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sub / Dub toggle */}
        {(hasSub || hasDub) && (
          <div className="flex overflow-hidden rounded-lg border border-white/15 text-xs font-semibold">
            {(["sub", "dub"] as const).map((a) => {
              const available = a === "sub" ? hasSub : hasDub;
              return (
                <button
                  key={a}
                  disabled={!available}
                  onClick={() => {
                    setAudio(a);
                    // Re-select a provider that has this audio for this episode
                    if (providers) {
                      const next = firstAvailableProvider(providers, a, episode);
                      setSelectedProvider(next);
                    }
                  }}
                  className={[
                    "px-3 py-1.5 uppercase tracking-wide transition-colors",
                    audio === a
                      ? "bg-primary text-black"
                      : available
                      ? "bg-white/6 text-white/70 hover:bg-white/12"
                      : "bg-white/3 text-white/25 cursor-not-allowed",
                  ].join(" ")}
                >
                  {a}
                </button>
              );
            })}
          </div>
        )}

        {/* Provider dropdown */}
        {availableProviders.length > 0 && (
          <div
            className="relative"
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setProviderOpen(false); }}
          >
            <button
              onClick={() => setProviderOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/6 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-white/30"
            >
              {selectedProvider ? providerLabel(selectedProvider) : "Source"}
              <ChevronDown className="size-3 text-white/40" />
            </button>
            {providerOpen && (
              <div className="absolute left-0 top-9 z-30 min-w-[140px] overflow-hidden rounded-lg border border-white/12 bg-[#1c1c1c] py-1 shadow-2xl">
                {availableProviders.map((name) => (
                  <button
                    key={name}
                    onClick={() => { setSelectedProvider(name); setProviderOpen(false); }}
                    className={[
                      "flex w-full items-center px-3.5 py-2 text-left text-xs transition-colors hover:bg-white/6",
                      name === selectedProvider ? "text-primary" : "text-white/75",
                    ].join(" ")}
                  >
                    {providerLabel(name)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {epLoading && (
          <span className="flex items-center gap-1.5 text-xs text-white/40">
            <Loader2 className="size-3 animate-spin" />
            Finding sources…
          </span>
        )}
      </div>

      {/* Video */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-xl">
        {poster && !error && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className={[
              "absolute inset-0 size-full object-cover transition-opacity duration-500",
              loading ? "opacity-25" : "opacity-0 pointer-events-none",
            ].join(" ")}
          />
        )}

        <video
          ref={videoRef}
          controls
          playsInline
          className={["size-full object-contain", loading || error ? "invisible" : "visible"].join(" ")}
        />

        {(loading || (!selectedProvider && !epLoading && !epError)) && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
            <Loader2 className="size-8 animate-spin text-white" />
            <p className="text-sm font-medium text-white/80">
              {loading ? `Loading episode ${episode}…` : "Finding available sources…"}
            </p>
          </div>
        )}

        {(error || epError) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center backdrop-blur-sm">
            <AlertTriangle className="size-8 text-amber-400" />
            <p className="max-w-xs text-sm font-medium text-white">{error ?? epError}</p>
            {availableProviders.length > 1 && error && (
              <p className="text-xs text-white/50">
                Try switching to a different source above.
              </p>
            )}
            <button
              onClick={() => { setError(null); setEpError(null); setRetryKey((k) => k + 1); }}
              className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
            >
              <RefreshCw className="size-4" />
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
