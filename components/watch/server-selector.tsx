"use client";

import { Headphones, Mic2, Zap, Flag, Download, Share2, Loader2 } from "lucide-react";
import { providerLabel, type EpisodesMap, type ProviderEpisode } from "./episode-utils";
import { SelectMenu } from "@/components/ui/select-menu";

interface ServerSelectorProps {
  animeId: number;
  animeTitle?: string;
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
  streamUrl?: string | null;
}

const EXCLUDED = new Set(["allmanga"]);

export function ServerSelector({
  animeId: _animeId,
  animeTitle,
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
  streamUrl,
}: ServerSelectorProps) {
  function handleDownload() {
    if (!streamUrl) return;
    const safeName = (animeTitle ?? "Episode")
      .replace(/[^\w\s]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);
    const filename = `${safeName}-Episode-${episode}.mp4`;
    const a = document.createElement("a");
    a.href = `/api/download?url=${encodeURIComponent(streamUrl)}&filename=${encodeURIComponent(filename)}`;
    a.download = filename;
    a.click();
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
            title={streamUrl ? "Download MP4" : "Waiting for stream…"}
            onClick={handleDownload}
            disabled={!streamUrl}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Download className="size-3.5" />
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

    </div>
  );
}
