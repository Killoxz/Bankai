"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import Hls from "hls.js";

interface DownPlayerProps {
  poster?: string;
  animeId: number;
}

export function DownPlayer({ poster, animeId }: DownPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hls: Hls | null = null;

    async function initPlayer() {
      setLoading(true);
      setError(null);

      try {
        // Connected directly to your real production address
        const apiUrl = `bankai-end-production.up.railway.app{animeId}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Server responded with status ${response.status}.`);
        
        const data = await response.json();
        const streamUrl: string = data.stream_url; 

        if (!streamUrl) {
          throw new Error("No live streaming link found in the server data.");
        }

        const video = videoRef.current;
        if (!video) return;

        if (Hls.isSupported()) {
          hls = new Hls({ maxMaxBufferLength: 30 });
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            video.play().catch(() => console.log("Autoplay blocked. Waiting for click."));
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              setError("An error occurred during video streaming playback.");
              setLoading(false);
            }
          });
        } 
        else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = streamUrl;
          video.addEventListener("loadedmetadata", () => {
            setLoading(false);
            video.play().catch(() => {});
          });
        } else {
          setError("Your web browser does not support HLS playback engines.");
          setLoading(false);
        }

      } catch (err: any) {
        console.error("Player Error:", err);
        setError(err.message || "Streaming services are temporarily unavailable.");
        setLoading(false);
      }
    }

    if (animeId) {
      initPlayer();
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [animeId]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-xl">
      {poster && !error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img 
          src={poster} 
          alt="" 
          className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${
            loading ? "opacity-20" : "opacity-0 pointer-events-none"
          }`} 
        />
      )}

      <video
        ref={videoRef}
        controls
        playsInline
        className={`size-full object-contain ${loading || error ? "hidden" : "block"}`}
      />

      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
          <Loader2 className="size-8 animate-spin text-white" />
          <p className="text-sm font-medium text-white/80">Connecting to Bankai API stream...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 px-4 text-center backdrop-blur-sm">
          <AlertTriangle className="size-8 text-amber-500" />
          <p className="text-sm font-medium text-white">{error}</p>
          <p className="text-xs text-white/40">Verify backend route parameter availability or cross-origin headers.</p>
        </div>
      )}
    </div>
  );
}
