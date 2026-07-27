"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, Loader2 } from "lucide-react";

export function VideoPlayer({ src, poster }: { src: string | null; poster?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setReady(false);
    if (src.endsWith(".m3u8") && !video.canPlayType("application/vnd.apple.mpegurl")) {
      let cancelled = false;
      import("hls.js").then(({ default: Hls }) => {
        if (cancelled) return;
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => setReady(true));
          return () => hls.destroy();
        }
      });
      return () => {
        cancelled = true;
      };
    } else {
      video.src = src;
      setReady(true);
    }
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    video.currentTime = (Number(e.target.value) / 100) * video.duration;
  };

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black"
    >
      {src ? (
        <video
          ref={videoRef}
          poster={poster}
          className="size-full"
          onClick={togglePlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.duration) setProgress((v.currentTime / v.duration) * 100);
          }}
          onWaiting={() => setReady(false)}
          onPlaying={() => setReady(true)}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 text-center">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" className="absolute inset-0 size-full object-cover opacity-20" />
          )}
          <p className="relative text-sm font-medium text-white/70">
            No stream source configured for this episode yet
          </p>
          <p className="relative text-xs text-white/40">Check back once a source is added.</p>
        </div>
      )}

      {src && !ready && (
        <div className="absolute inset-0 grid place-items-center bg-black/40">
          <Loader2 className="size-8 animate-spin text-white/80" />
        </div>
      )}

      {src && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={onSeek}
            className="mb-2 h-1 w-full cursor-pointer accent-primary"
          />
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
              {playing ? (
                <Pause className="size-5 fill-white text-white" />
              ) : (
                <Play className="size-5 fill-white text-white" />
              )}
            </button>
            <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
              {muted ? (
                <VolumeX className="size-5 text-white" />
              ) : (
                <Volume2 className="size-5 text-white" />
              )}
            </button>
            <div className="flex-1" />
            <button aria-label="Settings" className="text-white/70 hover:text-white">
              <Settings className="size-5" />
            </button>
            <button onClick={toggleFullscreen} aria-label="Fullscreen">
              <Maximize className="size-5 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
