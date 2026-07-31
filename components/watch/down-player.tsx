"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Play } from "lucide-react";
import Hls from "hls.js";

interface DownPlayerProps {
  poster?: string;
  animeId: number;
}

export function DownPlayer({ poster, animeId }: DownPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [customPath, setCustomPath] = useState<string>("/api/watch/");

  async function initPlayer(path: string) {
    setLoading(true);
    setError(null);

    // Clean up any existing HLS instances before trying a new path
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    try {
// This points directly to your newly deployed live production backend server!
const apiUrl = `bankai-end-production.up.railway.app/${animeId}`;


      
      console.log("Attempting to connect to:", apiUrl);
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}. Path might be incorrect.`);
      }
      
      const data = await response.json();
      
      // Look through common JSON properties for the video file link
      const streamUrl: string = data.stream_url || data.url || data.link || data.video || data.data?.url; 

      if (!streamUrl) {
        throw new Error("Connected to server, but no '.m3u8' streaming link was found in the response object.");
      }

      const video = videoRef.current;
      if (!video) return;

      if (Hls.isSupported()) {
        const hls = new Hls({ maxMaxBufferLength: 30 });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          video.play().catch(() => console.log("Autoplay blocked. Press play."));
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            setError("Playback error: The streaming source file is unreadable.");
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
        setError("Your browser does not support HLS media playback.");
        setLoading(false);
      }

    } catch (err: any) {
      console.error("Connection failed:", err);
      setError(err.message || "Failed to reach streaming server.");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (animeId) {
      initPlayer(customPath);
    }
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [animeId]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl border border-white/5">
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

      {/* Loading Overlay */}
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
          <Loader2 className="size-8 animate-spin text-white/80" />
          <p className="text-sm font-medium text-white/80">Connecting to Bankai API stream...</p>
        </div>
      )}

      {/* Interactive Error Adjuster Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/95 px-6 text-center text-white backdrop-blur-md">
          <AlertTriangle className="size-7 text-amber-500 mb-2" />
          <p className="text-sm font-semibold max-w-md text-zinc-200 mb-1">{error}</p>
          <p className="text-xs text-zinc-400 mb-4">
            Trying endpoint: <code className="bg-black/40 px-1 py-0.5 rounded text-amber-400">/your-path/{animeId}</code>
          </p>
          
          <div className="flex w-full max-w-md items-zinc gap-2 bg-zinc-800 p-1.5 rounded-lg border border-zinc-700">
            <span className="text-xs font-mono text-zinc-500 self-center pl-2 select-none">...up.railway.app</span>
            <input 
              type="text" 
              value={customPath} 
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="/watch/ or /api/episode/"
              className="flex-1 bg-zinc-950 text-xs text-emerald-400 px-3 py-1.5 rounded border border-zinc-800 focus:outline-none font-mono"
            />
            <button 
              onClick={() => initPlayer(customPath)}
              className="flex items-center gap-1 bg-white hover:bg-zinc-200 text-black px-3 py-1.5 rounded text-xs font-medium transition-colors"
            >
              <Play className="size-3 fill-black" /> Retest
            </button>
          </div>
          
          <p className="text-[11px] text-zinc-500 mt-3 max-w-xs">
            Try typing paths like <code className="text-zinc-400">/watch</code>, <code className="text-zinc-400">/episode</code>, or <code className="text-zinc-400">/stream</code> to see which route connects.
          </p>
        </div>
      )}
    </div>
  );
}
