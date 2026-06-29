"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  PictureInPicture2, SkipForward, SkipBack, Settings,
  Subtitles, Loader2, FastForward,
} from "lucide-react";
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "@/components/ui/dropdown";
import { usePlayerStore } from "@/store/player-store";
import { formatDuration, cn } from "@/lib/utils";
import type { StreamData } from "@/types/anime";

interface Level { height: number; index: number }

export function VideoPlayer({
  stream, poster, intro, outro, onEnded, onNext, onPrev, onProgress, startTime = 0,
}: {
  stream: StreamData;
  poster?: string | null;
  intro?: { start: number; end: number } | null;
  outro?: { start: number; end: number } | null;
  onEnded?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onProgress?: (current: number, duration: number) => void;
  /** Seek to this position (seconds) after the source loads — used for sub/dub switching */
  startTime?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const settingsOpenRef = useRef(false);

  const settings = usePlayerStore();
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [waiting, setWaiting] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [levels, setLevels] = useState<Level[]>([]);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPct, setHoverPct] = useState(0);
  const seekBarDragging = useRef(false);

  // Subtitle state — tracked by label string to avoid index mismatches with HLS-managed tracks
  const [subtitlesOn, setSubtitlesOn] = useState(true);
  const [activeLang, setActiveLang] = useState<string | null>(null);
  const [trackLabels, setTrackLabels] = useState<string[]>([]);

  // Stable refs so event handlers always see current values without re-registering
  const subtitlesOnRef = useRef(subtitlesOn);
  const activeLangRef = useRef(activeLang);
  const startTimeRef = useRef(startTime);
  useEffect(() => { subtitlesOnRef.current = subtitlesOn; }, [subtitlesOn]);
  useEffect(() => { activeLangRef.current = activeLang; }, [activeLang]);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);

  const source = stream.sources[0];

  // ── Attach HLS or native source ────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;

    setWaiting(true);
    setCurrent(0);
    setBuffered(0);
    setDuration(0);
    setPlaying(false);
    setLevels([]);
    setTrackLabels([]);
    setActiveLang(null);

    let destroyed = false;

    async function attach() {
      if (!video) return;
      if (source.isM3U8) {
        const { default: HlsLib } = await import("hls.js");
        if (destroyed) return;
        if (HlsLib.isSupported()) {
          const hls = new HlsLib({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30,
            // startPosition tells HLS where to start buffering from the beginning,
            // so we never need to seek after MANIFEST_PARSED (which would deadlock
            // because seeked can't fire before any data is buffered).
            startPosition: startTimeRef.current > 0 ? startTimeRef.current : -1,
          });
          hlsRef.current = hls;
          hls.loadSource(source.url);
          hls.attachMedia(video);

          hls.on(HlsLib.Events.MANIFEST_PARSED, (_e, data) => {
            if (destroyed) return; // cleanup already ran — don't call play() on a dead context
            setLevels(
              data.levels.map((l, i) => ({ height: l.height, index: i })).filter((l) => l.height)
            );
            if (settings.autoPlay) video.play().catch(() => {});
          });

          // These handlers fix audio sync when the user seeks while playing.
          // We intentionally don't use them for the initial startPosition seek
          // since startPosition is handled by HLS.js itself.
          const onSeeking = () => { hlsRef.current?.stopLoad(); };
          const onSeeked  = () => { hlsRef.current?.startLoad(video.currentTime); };
          video.addEventListener("seeking", onSeeking);
          video.addEventListener("seeked",  onSeeked);

          return () => {
            video.removeEventListener("seeking", onSeeking);
            video.removeEventListener("seeked",  onSeeked);
          };
        }
      }
      // Native video (non-HLS): seek after metadata is available
      video.src = source.url;
      if (startTimeRef.current > 0) {
        const seekOnce = () => {
          video.currentTime = startTimeRef.current;
          video.removeEventListener("loadedmetadata", seekOnce);
        };
        video.addEventListener("loadedmetadata", seekOnce);
      }
      if (settings.autoPlay) video.play().catch(() => {});
    }

    let cleanup: (() => void) | void;
    attach().then((fn) => { cleanup = fn; });

    return () => {
      destroyed = true;
      cleanup?.();
      // Fully reset the video element so stale audio tracks can't bleed into
      // the next source — this is the standard fix for HLS.js dual-audio bugs.
      const v = videoRef.current;
      if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.url]);

  // ── Subtitle track management ──────────────────────────────────────
  // Apply modes every time subtitlesOn / activeLang changes, and on new tracks.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function applyModes() {
      if (!video) return;
      const on = subtitlesOnRef.current;
      const lang = activeLangRef.current;
      Array.from(video.textTracks).forEach((t) => {
        if (t.kind !== "subtitles" && t.kind !== "captions") return;
        t.mode = (on && t.label === lang) ? "showing" : "hidden";
      });
    }

    function refreshList() {
      if (!video) return;
      const labels = [...new Set(
        Array.from(video.textTracks)
          .filter((t) => t.kind === "subtitles" || t.kind === "captions")
          .map((t) => t.label)
      )];
      setTrackLabels(labels);

      // Auto-select first English track on first load
      if (!activeLangRef.current && labels.length > 0) {
        const eng = labels.find((l) => l.toLowerCase().includes("english")) ?? labels[0];
        setActiveLang(eng);
        activeLangRef.current = eng;
      }
      applyModes();
    }

    refreshList();
    video.textTracks.addEventListener("addtrack", refreshList);
    // Also listen for browser-initiated track changes (e.g. right-click menu)
    video.textTracks.addEventListener("change", applyModes);

    return () => {
      video.textTracks.removeEventListener("addtrack", refreshList);
      video.textTracks.removeEventListener("change", applyModes);
    };
  // Re-run when source changes (new episode) or user toggles captions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.url, subtitlesOn, activeLang]);

  // ── Apply persisted volume/rate ────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = settings.volume;
    v.muted = settings.muted;
    v.playbackRate = settings.playbackRate;
  }, [settings.volume, settings.muted, settings.playbackRate]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(time, v.duration || 0));
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!settingsOpenRef.current && videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 2800);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setFullscreen((prev) => {
      const next = !prev;
      // Also attempt native OS-level fullscreen alongside the CSS approach.
      // Native fullscreen gives the real "no browser chrome" experience when
      // available; CSS fixed-positioning is the reliable fallback.
      if (next) {
        containerRef.current?.requestFullscreen().catch(() => {});
      } else {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      }
      setShowControls(true);
      return next;
    });
  }, []);

  // Sync CSS state when native fullscreen is exited externally (Esc key, etc.)
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) {
        setFullscreen(false);
      }
      setShowControls(true);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key.toLowerCase()) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "arrowright": seek(v.currentTime + 5); break;
        case "arrowleft":  seek(v.currentTime - 5); break;
        case "arrowup":    settings.setSettings({ volume: Math.min(1, settings.volume + 0.1) }); break;
        case "arrowdown":  settings.setSettings({ volume: Math.max(0, settings.volume - 0.1) }); break;
        case "f": toggleFullscreen(); break;
        case "escape": if (fullscreen) toggleFullscreen(); break;
        case "m": settings.setSettings({ muted: !settings.muted }); break;
        case "n": onNext?.(); break;
        case "c": setSubtitlesOn((v) => !v); break;
      }
      showControlsTemporarily();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [togglePlay, seek, toggleFullscreen, fullscreen, settings, onNext, showControlsTemporarily]);

  // Lock body scroll while in CSS fullscreen so the page doesn't move behind the player
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = fullscreen ? "hidden" : prev;
    return () => { document.body.style.overflow = prev; };
  }, [fullscreen]);

  const togglePiP = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch { /* unsupported */ }
  };

  const setQuality = (index: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = index;
    settings.setSettings({ quality: index === -1 ? "auto" : `${levels.find((l) => l.index === index)?.height}p` });
  };

  const selectCaption = useCallback((lang: string | null) => {
    const video = videoRef.current;
    if (lang === null) {
      // Update refs BEFORE touching track modes — the "change" event fires synchronously
      // and applyModes() reads these refs, so they must be current before that happens.
      subtitlesOnRef.current = false;
      setSubtitlesOn(false);
      if (video) {
        Array.from(video.textTracks).forEach((t) => { t.mode = "hidden"; });
      }
    } else {
      subtitlesOnRef.current = true;
      activeLangRef.current = lang;
      setSubtitlesOn(true);
      setActiveLang(lang);
      if (video) {
        Array.from(video.textTracks).forEach((t) => {
          if (t.kind !== "subtitles" && t.kind !== "captions") return;
          t.mode = t.label === lang ? "showing" : "hidden";
        });
      }
    }
  }, []);

  const inIntro = intro && current >= intro.start && current < intro.end;
  const inOutro = outro && current >= outro.start && current < outro.end;
  const captionsActive = subtitlesOn && !!activeLang && trackLabels.length > 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative bg-black",
        fullscreen
          ? "fixed inset-0 z-[9999] w-screen h-screen rounded-none"
          : "w-full aspect-video rounded-xl"
      )}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {/* Video clip wrapper — overflow-hidden lives here so dropdowns aren't clipped */}
      <div className={cn("absolute inset-0 overflow-hidden", fullscreen ? "" : "rounded-xl")}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        poster={poster ?? undefined}
        className="size-full object-contain"
        playsInline
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setCurrent(v.currentTime);
          if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
          // Always report — WatchView throttles the expensive history write internally
          onProgress?.(v.currentTime, v.duration);
          if (settings.autoSkipIntro && intro && v.currentTime >= intro.start && v.currentTime < intro.end) {
            v.currentTime = intro.end;
          }
          if (settings.autoSkipOutro && outro && v.currentTime >= outro.start && v.currentTime < outro.end) {
            v.currentTime = outro.end;
          }
        }}
        onEnded={() => {
          onProgress?.(duration, duration);
          if (settings.autoNext) onNext?.();
          onEnded?.();
        }}
      >
        {/* Force remount of track elements when source changes via source?.url in key */}
        {stream.subtitles.map((s, i) => (
          <track
            key={`${source?.url ?? ""}-${s.lang}-${i}`}
            kind="captions"
            src={
              s.url.startsWith("http")
                ? `/api/proxy/stream?url=${encodeURIComponent(s.url)}`
                : s.url
            }
            srcLang={s.lang.slice(0, 2).toLowerCase()}
            label={s.lang}
          />
        ))}
      </video>
      </div>{/* end video clip wrapper */}

      {/* Buffering spinner */}
      {waiting && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="size-12 animate-spin text-white/80" />
        </div>
      )}

      {/* Skip intro / outro */}
      <div className="absolute bottom-20 right-4 z-20 flex flex-col items-end gap-2">
        {inIntro && (
          <button
            onClick={() => seek(intro!.end)}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/70 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/90"
          >
            <FastForward className="size-4" /> Skip Intro
          </button>
        )}
        {inOutro && (
          <button
            onClick={() => seek(outro!.end)}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/70 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/90"
          >
            <FastForward className="size-4" /> Skip Outro
          </button>
        )}
      </div>

      {/* Controls overlay */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 to-transparent px-3 pb-2 pt-16 transition-opacity duration-300",
          showControls || !playing ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Seek bar — draggable with pointer capture */}
        <div
          className="group/seek relative mb-3 h-5 cursor-pointer select-none touch-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seekBarDragging.current = true;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const t = (x / rect.width) * (duration || 0);
            const pct = (x / rect.width) * 100;
            setDragTime(t); setHoverTime(t); setHoverPct(pct);
            seek(t);
          }}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const t = (x / rect.width) * (duration || 0);
            const pct = (x / rect.width) * 100;
            setHoverTime(t); setHoverPct(pct);
            if (seekBarDragging.current) { setDragTime(t); seek(t); }
          }}
          onPointerUp={(e) => {
            if (!seekBarDragging.current) return;
            seekBarDragging.current = false;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const t = (x / rect.width) * (duration || 0);
            seek(t); setDragTime(null);
          }}
          onPointerLeave={() => { if (!seekBarDragging.current) setHoverTime(null); }}
          onPointerCancel={() => {
            seekBarDragging.current = false;
            setDragTime(null); setHoverTime(null);
          }}
        >
          {/* Time preview tooltip */}
          {hoverTime !== null && (
            <div
              className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-md bg-black/85 px-2 py-0.5 text-xs font-medium text-white tabular-nums shadow-lg backdrop-blur-sm"
              style={{ left: `clamp(1.5rem, ${hoverPct}%, calc(100% - 1.5rem)` }}
            >
              {formatDuration(hoverTime)}
            </div>
          )}

          <div className={cn(
            "absolute bottom-0 w-full rounded-full bg-white/25 transition-all",
            dragTime !== null ? "h-1.5" : "h-1 group-hover/seek:h-1.5"
          )}>
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/30"
              style={{ width: `${(buffered / (duration || 1)) * 100}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              style={{ width: `${((dragTime ?? current) / (duration || 1)) * 100}%` }}
            >
              <span className={cn(
                "absolute -right-2 top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-primary shadow-md ring-2 ring-white/20 transition-opacity",
                dragTime !== null ? "opacity-100" : "opacity-0 group-hover/seek:opacity-100"
              )} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-white">
          <Ctrl onClick={togglePlay} label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
          </Ctrl>
          {onPrev && <Ctrl onClick={onPrev} label="Previous episode"><SkipBack className="fill-current" /></Ctrl>}
          {onNext && <Ctrl onClick={onNext} label="Next episode"><SkipForward className="fill-current" /></Ctrl>}

          {/* Volume */}
          <div className="flex items-center gap-1">
            <Ctrl
              onClick={() => settings.setSettings({ muted: !settings.muted })}
              label={settings.muted || settings.volume === 0 ? "Unmute" : "Mute"}
            >
              {settings.muted || settings.volume === 0 ? <VolumeX /> : <Volume2 />}
            </Ctrl>
            <input
              type="range"
              min={0} max={1} step={0.02}
              value={settings.muted ? 0 : settings.volume}
              onChange={(e) =>
                settings.setSettings({ volume: Number(e.target.value), muted: Number(e.target.value) === 0 })
              }
              aria-label="Volume"
              className="hidden sm:block h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/30 accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
          </div>

          <span className="ml-1 text-xs tabular-nums text-white/80">
            {formatDuration(current)} / {formatDuration(duration || 0)}
          </span>

          <div className="ml-auto flex items-center gap-0.5">
            {/* CC button — always visible */}
            <Dropdown
              align="end"
              side="top"
              trigger={
                <Ctrl label="Captions (C)" active={captionsActive}>
                  <span className={cn(
                    "relative flex items-center justify-center",
                    !trackLabels.length && "opacity-40"
                  )}>
                    <Subtitles className="size-5" />
                    {captionsActive && (
                      <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-primary" />
                    )}
                  </span>
                </Ctrl>
              }
              className="min-w-[13rem]"
            >
              <DropdownLabel>Captions</DropdownLabel>
              {trackLabels.length === 0 ? (
                <DropdownItem onClick={() => {}}>No captions available</DropdownItem>
              ) : (
                <>
                  <DropdownItem onClick={() => selectCaption(null)}>
                    {!subtitlesOn ? "• " : ""}Off
                  </DropdownItem>
                  {trackLabels.map((label) => (
                    <DropdownItem
                      key={label}
                      onClick={() => selectCaption(label)}
                    >
                      {subtitlesOn && activeLang === label ? "• " : ""}{label}
                    </DropdownItem>
                  ))}
                </>
              )}
            </Dropdown>

            {/* Settings — stays open while interacting; controls stay visible while it's open */}
            <Dropdown
              align="end"
              side="top"
              closeOnItemClick={false}
              onOpenChange={(open) => {
                settingsOpenRef.current = open;
                if (open) { clearTimeout(hideTimer.current); setShowControls(true); }
              }}
              trigger={
                <Ctrl label="Settings">
                  <Settings />
                </Ctrl>
              }
              className="min-w-[15rem]"
            >
              <div>
                <DropdownLabel>Playback speed</DropdownLabel>
                <div className="flex flex-wrap gap-1 px-2 pb-2">
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        settings.setSettings({ playbackRate: r });
                        if (videoRef.current) videoRef.current.playbackRate = r;
                      }}
                      className={cn(
                        "rounded-md px-2 py-1 text-xs transition-colors",
                        settings.playbackRate === r
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/80"
                      )}
                    >
                      {r === 1 ? "Normal" : `${r}x`}
                    </button>
                  ))}
                </div>

                {levels.length > 0 && (
                  <>
                    <DropdownSeparator />
                    <DropdownLabel>Quality</DropdownLabel>
                    <DropdownItem
                      onClick={() => setQuality(-1)}
                      className={settings.quality === "auto" ? "text-primary font-medium" : ""}
                    >
                      {settings.quality === "auto" && "• "}Auto
                    </DropdownItem>
                    {[...levels].sort((a, b) => b.height - a.height).map((l) => (
                      <DropdownItem
                        key={l.index}
                        onClick={() => setQuality(l.index)}
                        className={settings.quality === `${l.height}p` ? "text-primary font-medium" : ""}
                      >
                        {settings.quality === `${l.height}p` && "• "}{l.height}p
                      </DropdownItem>
                    ))}
                  </>
                )}

                <DropdownSeparator />
                <DropdownLabel>Captions</DropdownLabel>
                {trackLabels.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No captions available</div>
                ) : (
                  <>
                    <DropdownItem
                      onClick={() => selectCaption(null)}
                      className={!subtitlesOn ? "text-primary font-medium" : ""}
                    >
                      {!subtitlesOn && "• "}Off
                    </DropdownItem>
                    {trackLabels.map((label) => (
                      <DropdownItem
                        key={label}
                        onClick={() => selectCaption(label)}
                        className={subtitlesOn && activeLang === label ? "text-primary font-medium" : ""}
                      >
                        {subtitlesOn && activeLang === label && "• "}{label}
                      </DropdownItem>
                    ))}
                  </>
                )}

                <DropdownSeparator />
                <DropdownItem onClick={() => settings.setSettings({ autoPlay: !settings.autoPlay })}>
                  Autoplay: <span className={settings.autoPlay ? "text-primary ml-auto" : "text-muted-foreground ml-auto"}>{settings.autoPlay ? "On" : "Off"}</span>
                </DropdownItem>
                <DropdownItem onClick={() => settings.setSettings({ autoNext: !settings.autoNext })}>
                  Auto next: <span className={settings.autoNext ? "text-primary ml-auto" : "text-muted-foreground ml-auto"}>{settings.autoNext ? "On" : "Off"}</span>
                </DropdownItem>
                <DropdownItem onClick={() => settings.setSettings({ autoSkipIntro: !settings.autoSkipIntro })}>
                  Skip intro: <span className={settings.autoSkipIntro ? "text-primary ml-auto" : "text-muted-foreground ml-auto"}>{settings.autoSkipIntro ? "On" : "Off"}</span>
                </DropdownItem>
                <DropdownItem onClick={() => settings.setSettings({ autoSkipOutro: !settings.autoSkipOutro })}>
                  Skip outro: <span className={settings.autoSkipOutro ? "text-primary ml-auto" : "text-muted-foreground ml-auto"}>{settings.autoSkipOutro ? "On" : "Off"}</span>
                </DropdownItem>
              </div>
            </Dropdown>

            <span className="hidden sm:contents"><Ctrl onClick={togglePiP} label="Picture in picture"><PictureInPicture2 /></Ctrl></span>
            <Ctrl
              onClick={toggleFullscreen}
              label={fullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
            >
              {fullscreen ? <Minimize /> : <Maximize />}
            </Ctrl>
          </div>
        </div>
      </div>

      {/* Center play affordance when paused */}
      {!playing && !waiting && (
        <button
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 z-0 grid place-items-center"
        >
          <span className="grid size-16 place-items-center rounded-full bg-primary/90 text-white shadow-2xl">
            <Play className="size-7 translate-x-0.5 fill-current" />
          </span>
        </button>
      )}
    </div>
  );
}

function Ctrl({
  children, onClick, label, active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-9 place-items-center rounded-lg transition-colors hover:bg-white/15 [&_svg]:size-5",
        active ? "text-primary" : "text-white"
      )}
    >
      {children}
    </button>
  );
}
