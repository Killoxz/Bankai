"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

// Browser UMD build of WebTorrent (v1.x with UMD dist)
const WT_CDN = "https://cdn.jsdelivr.net/npm/webtorrent@1/dist/webtorrent.min.js";

interface Props {
  magnetUri: string;
  poster?: string;
  startTime?: number;
  onProgress?: (current: number, duration: number) => void;
}

type Status = "init" | "connecting" | "streaming" | "error";

export function TorrentPlayer({ magnetUri, poster, startTime = 0, onProgress }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<any>(null);
  const [status, setStatus] = useState<Status>("init");
  const [peers, setPeers] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!magnetUri || !videoRef.current) return;

    let dead = false;

    // Abort if no stream starts within 50 seconds
    const timeout = setTimeout(() => {
      if (!dead && status !== "streaming") {
        setStatus("error");
        setError("No peers found. Try again later or open in a torrent client.");
      }
    }, 50_000);

    const startStreaming = () => {
      if (dead) return;
      const WT = (window as any).WebTorrent;
      if (!WT) {
        setStatus("error");
        setError("Streaming library failed to load. Try disabling your ad blocker.");
        clearTimeout(timeout);
        return;
      }

      setStatus("connecting");
      const client = new WT();
      clientRef.current = client;

      client.on("error", (err: Error) => {
        if (!dead) {
          clearTimeout(timeout);
          setStatus("error");
          setError(err?.message ?? "Torrent error");
        }
      });

      client.add(magnetUri, (torrent: any) => {
        if (dead) return;
        clearTimeout(timeout);

        // Stream the largest file (the video, not subtitle/nfo files)
        const file = torrent.files.reduce(
          (a: any, b: any) => (a.length > b.length ? a : b)
        );

        file.renderTo(videoRef.current!, {
          autoplay: true,
          controls: true,
        });

        setStatus("streaming");

        if (startTime > 0 && videoRef.current) {
          videoRef.current.currentTime = startTime;
        }

        // Wire up onProgress callback to the video element's timeupdate
        const vid = videoRef.current!;
        const handleTime = () => {
          if (onProgress && vid.duration) {
            onProgress(vid.currentTime, vid.duration);
          }
        };
        vid.addEventListener("timeupdate", handleTime);

        torrent.on("download", () => {
          if (!dead) {
            setPeers(torrent.numPeers);
            setBuffered(Math.round(torrent.progress * 100));
          }
        });
      });
    };

    // Load WebTorrent from CDN if not already present
    if (typeof (window as any).WebTorrent !== "undefined") {
      startStreaming();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${WT_CDN}"]`
      );
      if (existing) {
        // Script tag already injected but might still be loading
        existing.addEventListener("load", startStreaming, { once: true });
      } else {
        const s = document.createElement("script");
        s.src = WT_CDN;
        s.async = true;
        s.onload = startStreaming;
        s.onerror = () => {
          if (!dead) {
            clearTimeout(timeout);
            setStatus("error");
            setError("Failed to load streaming engine. Try disabling your ad blocker.");
          }
        };
        document.head.appendChild(s);
      }
    }

    return () => {
      dead = true;
      clearTimeout(timeout);
      clientRef.current?.destroy();
      clientRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magnetUri]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      {/* Video element always mounted so renderTo() can target it */}
      <video
        ref={videoRef}
        poster={poster}
        className="h-full w-full"
        style={{ opacity: status === "streaming" ? 1 : 0 }}
      />

      {status !== "streaming" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          {poster && (
            <img
              src={poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-20"
            />
          )}
          <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center text-white">
            {status === "error" ? (
              <>
                <AlertTriangle className="size-10 text-yellow-500" />
                <p className="text-sm leading-relaxed">{error}</p>
                <a
                  href={magnetUri}
                  className="mt-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Open in torrent client
                </a>
              </>
            ) : (
              <>
                <Loader2 className="size-10 animate-spin" />
                <p className="text-sm">
                  {status === "init"
                    ? "Loading streaming engine…"
                    : peers > 0
                    ? `Connecting to ${peers} peer${peers !== 1 ? "s" : ""}…`
                    : "Finding peers…"}
                </p>
                {status === "connecting" && (
                  <p className="text-xs text-white/50">This may take up to 30 seconds</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Thin torrent progress bar just above video controls */}
      {status === "streaming" && buffered < 99 && (
        <div className="pointer-events-none absolute bottom-12 left-0 right-0">
          <div className="h-0.5 bg-white/20">
            <div
              className="h-0.5 bg-primary transition-all duration-500"
              style={{ width: `${buffered}%` }}
            />
          </div>
          <p className="mt-0.5 pr-2 text-right text-[10px] text-white/50">
            {buffered}% buffered · {peers} peer{peers !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
