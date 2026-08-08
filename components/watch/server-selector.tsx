"use client";

import { useState } from "react";
import { Headphones, Mic2, Zap, Flag, Download, Share2, Loader2, X, Check, Copy, PlayCircle } from "lucide-react";
import { providerLabel, type EpisodesMap, type ProviderEpisode } from "./episode-utils";
import { SelectMenu } from "@/components/ui/select-menu";

interface ServerSelectorProps {
  animeId: number;
  episode: number;
  episodeMeta: ProviderEpisode | null;
  audio: "sub" | "dub";
  hasSub: boolean;
  hasDub: boolean;
  onAudioChange: (a: "sub" | "dub") => void;
  providersData: EpisodesMap | null;
  selectedProvider: string | null;
  onProviderChange: (p: string) => void;
  failedProviders?: Set<string>;
  isLoading?: boolean;
}

const EXCLUDED = new Set(["allmanga"]);

export function ServerSelector({
  animeId,
  episode,
  episodeMeta,
  audio,
  hasSub,
  hasDub,
  onAudioChange,
  providersData,
  selectedProvider,
  onProviderChange,
  failedProviders = new Set(),
  isLoading = false,
}: ServerSelectorProps) {
  const [dlState, setDlState]     = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [dlUrl, setDlUrl]         = useState<string | null>(null);
  const [dlOpen, setDlOpen]       = useState(false);
  const [copied, setCopied]       = useState(false);

  async function handleDownload() {
    if (!selectedProvider) return;
    setDlState("loading");
    setDlOpen(true);
    try {
      const params = new URLSearchParams({ id: String(animeId), ep: String(episode), provider: selectedProvider, audio });
      const res = await fetch(`/api/stream?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as { stream_url?: string; error?: string };
      if (!data.stream_url) throw new Error(data.error ?? "No stream URL");
      setDlUrl(typeof window !== "undefined" ? window.location.origin + data.stream_url : data.stream_url);
      setDlState("ready");
    } catch {
      setDlState("error");
    }
  }

  function copyUrl() {
    if (!dlUrl) return;
    navigator.clipboard.writeText(dlUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  const servers = providersData
    ? Object.keys(providersData).filter((name) => {
        if (EXCLUDED.has(name)) return false;
        const d = providersData[name];
        return !d?.error && (d?.episodes?.[audio] ?? []).some((e) => e.number === episode);
      })
    : [];

  const serverCount = servers.length;

  const title = episodeMeta?.title && episodeMeta.title !== `Episode ${episode}`
    ? episodeMeta.title
    : `Episode ${episode}`;

  const airDate = episodeMeta?.airDate
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" })
        .format(new Date(episodeMeta.airDate))
    : null;

  const subCount = providersData
    ? Object.values(providersData).filter(
        (d) => !d.error && (d.episodes?.sub ?? []).some((e) => e.number === episode)
      ).length
    : 0;
  const dubCount = providersData
    ? Object.values(providersData).filter(
        (d) => !d.error && (d.episodes?.dub ?? []).some((e) => e.number === episode)
      ).length
    : 0;

  const audioOptions = [
    ...(hasSub ? [{ value: "sub", label: "Sub" }] : []),
    ...(hasDub ? [{ value: "dub", label: "Dub" }] : []),
  ];

  const serverOptions = servers.map((name) => ({
    value: name,
    label: providerLabel(name),
    disabled: failedProviders.has(name),
  }));

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">

      {/* Row 1: AUDIO / SERVER labels — right-aligned */}
      <div className="flex justify-end gap-5 text-[11px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1">
          <Headphones className="size-3" /> AUDIO
        </span>
        <span className="flex items-center gap-1">
          <Zap className="size-3" /> SERVER{serverCount > 0 ? ` (${serverCount})` : ""}
        </span>
      </div>

      {/* Row 2: episode title left · dropdowns right */}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground">
          <span className="mr-1 text-muted-foreground">{episode}.</span>{title}
        </h2>

        <div className="flex items-center gap-2">
          <SelectMenu
            value={audio}
            options={audioOptions}
            onChange={(v) => onAudioChange(v as "sub" | "dub")}
            icon={<Mic2 className="size-3.5" />}
          />

          {isLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Loading…</span>
            </div>
          ) : servers.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground">
              <Zap className="size-3.5" />
              <span>No servers</span>
            </div>
          ) : (
            <SelectMenu
              value={selectedProvider ?? ""}
              options={serverOptions}
              onChange={onProviderChange}
              icon={<Zap className="size-3.5" />}
              maxHeight={220}
            />
          )}
        </div>
      </div>

      {/* Row 3: meta badges left · action buttons right */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {airDate && (
            <span className="text-xs text-muted-foreground">{airDate}</span>
          )}
          {subCount > 0 && (
            <span className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              CC {subCount}
            </span>
          )}
          {dubCount > 0 && (
            <span className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              <Mic2 className="size-3" /> {dubCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            title="Report"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Flag className="size-3.5" />
            Report
          </button>

          <button
            title="Download"
            onClick={handleDownload}
            disabled={!selectedProvider || dlState === "loading"}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            {dlState === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Download
          </button>

          <button
            title="Share"
            onClick={() => { navigator.clipboard.writeText(window.location.href).catch(() => {}); }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Share2 className="size-3.5" />
            Share
          </button>
        </div>
      </div>

      {/* Download modal */}
      {dlOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDlOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1c1c1c] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-white">Download Episode {episode}</h3>
              <button onClick={() => setDlOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X className="size-4" />
              </button>
            </div>

            {dlState === "loading" && (
              <div className="flex items-center justify-center gap-3 py-6 text-sm text-white/50">
                <Loader2 className="size-4 animate-spin" /> Fetching stream URL…
              </div>
            )}

            {dlState === "error" && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                Could not fetch the stream URL. Try a different server.
              </p>
            )}

            {dlState === "ready" && dlUrl && (
              <>
                <p className="mb-4 text-xs leading-relaxed text-white/50">
                  This is an HLS stream. Copy the URL below and open it in VLC Media Player or any HLS-compatible downloader to save the episode.
                </p>
                <div className="mb-4 flex gap-2">
                  <input
                    readOnly
                    value={dlUrl}
                    className="flex-1 truncate rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 outline-none"
                  />
                  <button
                    onClick={copyUrl}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/15"
                  >
                    {copied ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <a
                  href={`vlc://${dlUrl.replace(/^https?:\/\//, "")}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-black transition-all hover:brightness-110"
                >
                  <PlayCircle className="size-4" /> Open in VLC
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
