"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import Hls from "hls.js";
import { useAuthStore } from "@/store/auth-store";

interface DownPlayerProps {
  poster?: string;
  animeId: number;
  episode?: number;
}

export function DownPlayer({ poster, animeId, episode = 1 }: DownPlayerProps) {
  const videoRef    = useRef<HTMLVideoElement | null>(null);
  const hlsRef      = useRef<Hls | null>(null);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [retryKey, setRetryKey]   = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function initPlayer() {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/stream?id=${animeId}&ep=${episode}&path=/api/watch/`
        );
        if (!res.ok) throw new Error(`Server responded with status ${res.status}.`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const streamUrl: string = data.stream_url ?? data.url ?? data.streamUrl;
        if (!streamUrl) throw new Error("No streaming link returned from the server.");

        if (cancelled) return;

        const video = videoRef.current;
        if (!video) return;

        if (Hls.isSupported()) {
          const hls = new Hls({ maxMaxBufferLength: 30 });
          hlsRef.current = hls;
          hls.loadSource(streamUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (cancelled) return;
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
            if (d.fatal && !cancelled) {
              setError("Streaming playback error — the source may be unavailable.");
              setLoading(false);
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = streamUrl;
          video.addEventListener("loadedmetadata", () => {
            if (cancelled) return;
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
        } else {
          throw new Error("Your browser does not support HLS playback.");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Streaming is temporarily unavailable."
          );
          setLoading(false);
        }
      }
    }

    initPlayer();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [animeId, episode, retryKey]);

  return (
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

      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
          <Loader2 className="size-8 animate-spin text-white" />
          <p className="text-sm font-medium text-white/80">
            Loading episode {episode}…
          </p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center backdrop-blur-sm">
          <AlertTriangle className="size-8 text-amber-400" />
          <p className="max-w-xs text-sm font-medium text-white">{error}</p>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
          >
            <RefreshCw className="size-4" />
            Try Again
          </button>
          <p className="text-xs text-white/35">
            Streaming APIs can be intermittent — try again in a moment.
          </p>
        </div>
      )}
    </div>
  );
}
