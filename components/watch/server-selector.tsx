"use client";

import { Mic2, Zap, Flag, Download, Share2, Loader2 } from "lucide-react";
import { providerLabel, type EpisodesMap, type ProviderEpisode } from "./episode-utils";

interface ServerSelectorProps {
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

  const selectCls =
    "appearance-none cursor-pointer rounded-lg bg-white/10 py-2 text-sm font-semibold text-white/85 outline-none hover:bg-white/15 transition-colors";

  return (
    <div className="rounded-xl border border-white/[0.05] bg-[#111] px-5 py-4">

      {/* ── Top row: title + label hints ───────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 text-base font-bold text-white">
          {episode}. {title}
        </h2>
        <div className="flex shrink-0 items-center gap-3 text-[11px] text-white/30">
          <span className="flex items-center gap-1"><Mic2 className="size-3" /> AUDIO</span>
          <span className="flex items-center gap-1">
            <Zap className="size-3" /> SERVER{serverCount > 0 ? ` (${serverCount})` : ""}
          </span>
        </div>
      </div>

      {/* ── Meta row ────────────────────────────────────────────────────── */}
      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        {airDate && <span className="text-xs text-white/40">{airDate}</span>}
        {subCount > 0 && (
          <span className="flex items-center gap-1 rounded border border-white/10 px-2 py-0.5 text-[11px] font-medium text-white/60">
            <Mic2 className="size-3" /> {subCount}
          </span>
        )}
        {dubCount > 0 && (
          <span className="flex items-center gap-1 rounded border border-white/10 px-2 py-0.5 text-[11px] font-medium text-primary/70">
            <Mic2 className="size-3" /> {dubCount}
          </span>
        )}
      </div>

      {/* ── Controls row: dropdowns + actions ───────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-center gap-2">

        {/* Audio dropdown */}
        <div className="relative flex items-center">
          <Mic2 className="pointer-events-none absolute left-2.5 size-3.5 text-white/50" />
          <select
            value={audio}
            onChange={(e) => onAudioChange(e.target.value as "sub" | "dub")}
            className={`${selectCls} pl-7 pr-3`}
          >
            {hasSub && <option value="sub">Sub</option>}
            {hasDub && <option value="dub">Dub</option>}
          </select>
        </div>

        {/* Server dropdown */}
        <div className="relative flex items-center">
          <Zap className="pointer-events-none absolute left-2.5 size-3.5 text-white/50" />
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/30">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Loading…</span>
            </div>
          ) : servers.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/25">
              <Zap className="size-3.5" />
              <span>No servers</span>
            </div>
          ) : (
            <select
              value={selectedProvider ?? ""}
              onChange={(e) => onProviderChange(e.target.value)}
              className={`${selectCls} pl-7 pr-3 max-w-[160px]`}
            >
              {servers.map((name) => (
                <option
                  key={name}
                  value={name}
                  disabled={failedProviders.has(name)}
                >
                  {providerLabel(name)}{failedProviders.has(name) ? " (failed)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Report / Download / Share */}
        <div className="ml-auto flex items-center gap-1">
          {[
            { icon: Flag,     label: "Report"   },
            { icon: Download, label: "Download" },
            { icon: Share2,   label: "Share"    },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              title={label}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
