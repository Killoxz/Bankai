"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search, List, Grid2X2, Image as ImageIcon, ChevronDown,
  Mic2, Zap, Play,
} from "lucide-react";
import { providerLabel, type EpisodesMap, type ProviderEpisode } from "./episode-utils";
import { useSettingsStore } from "@/store/settings-store";

interface EpisodeListProps {
  totalEpisodes: number;
  currentEpisode: number;
  onSelectEpisode: (ep: number) => void;
  episodeData: ProviderEpisode[];
  hasSub: boolean;
  hasDub: boolean;
  currentAudio: "sub" | "dub";
  // Optional: passed for list-mode server/audio controls
  providersData?: EpisodesMap | null;
  selectedProvider?: string | null;
  onProviderChange?: (p: string) => void;
  onAudioChange?: (a: "sub" | "dub") => void;
}

const BATCH = 50;
const EXCLUDED = new Set(["allmanga"]);

function pad2(n: number) { return String(n).padStart(2, "0"); }

function formatAirDate(d: string | null | undefined): string | null {
  if (!d) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(d));
  } catch { return null; }
}

export function EpisodeList({
  totalEpisodes,
  currentEpisode,
  onSelectEpisode,
  episodeData,
  hasSub,
  hasDub,
  currentAudio,
  providersData,
  selectedProvider,
  onProviderChange,
  onAudioChange,
}: EpisodeListProps) {
  const defaultLayout   = useSettingsStore((s) => s.episodeLayout);
  const setStoredLayout = useSettingsStore((s) => s.setEpisodeLayout);

  const [search, setSearch]         = useState("");
  const [batchStart, setBatchStart] = useState(1);
  const [batchOpen, setBatchOpen]   = useState(false);
  const [viewMode, setViewMode]     = useState<"list" | "grid" | "image">(defaultLayout);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  function changeView(mode: "list" | "grid" | "image") {
    setViewMode(mode);
    setStoredLayout(mode);
  }

  const batchEnd     = Math.min(batchStart + BATCH - 1, totalEpisodes);
  const totalBatches = Math.ceil(totalEpisodes / BATCH);

  useEffect(() => {
    const correctStart = (Math.ceil(currentEpisode / BATCH) - 1) * BATCH + 1;
    setBatchStart(Math.max(1, correctStart));
  }, [currentEpisode]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [batchStart, currentEpisode]);

  if (totalEpisodes <= 1) return null;

  const batchNums = Array.from({ length: batchEnd - batchStart + 1 }, (_, i) => batchStart + i);
  const metaByNum = new Map<number, ProviderEpisode>(episodeData.map((ep) => [ep.number, ep]));

  const filtered = batchNums.filter((n) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    if (String(n).includes(q)) return true;
    return !!metaByNum.get(n)?.title?.toLowerCase().includes(q);
  });

  // Per-episode server list from providersData
  function serversForEpisode(n: number, audio: "sub" | "dub"): string[] {
    if (!providersData) return [];
    return Object.keys(providersData).filter((name) => {
      if (EXCLUDED.has(name)) return false;
      const d = providersData[name];
      return !d?.error && (d?.episodes?.[audio] ?? []).some((e) => e.number === n);
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.05] bg-[#111]">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-3">
        {/* Batch range picker */}
        <div className="relative">
          <button
            onClick={() => setBatchOpen((o) => !o)}
            className="flex items-center gap-1 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/15"
          >
            {batchStart}–{batchEnd}
            <ChevronDown className="size-3 text-white/40" />
          </button>
          {batchOpen && (
            <div className="absolute left-0 top-9 z-30 max-h-40 w-28 overflow-y-auto rounded-lg border border-white/[0.05] bg-[#1a1a1a] py-1 shadow-2xl">
              {Array.from({ length: totalBatches }, (_, i) => {
                const s = i * BATCH + 1;
                const e = Math.min(s + BATCH - 1, totalEpisodes);
                return (
                  <button
                    key={s}
                    onClick={() => { setBatchStart(s); setBatchOpen(false); setSearch(""); }}
                    className={["block w-full px-3 py-1.5 text-left text-xs hover:bg-white/5", s === batchStart ? "text-primary" : "text-white/70"].join(" ")}
                  >
                    {s}–{e}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter episodes…"
            className="w-full rounded-md border border-white/[0.05] bg-white/5 py-1.5 pl-8 pr-3 text-xs text-white outline-none placeholder:text-white/25 focus:border-white/20"
          />
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-1">
          {(["list", "grid", "image"] as const).map((mode) => {
            const Icon = mode === "list" ? List : mode === "grid" ? Grid2X2 : ImageIcon;
            return (
              <button
                key={mode}
                onClick={() => changeView(mode)}
                aria-label={mode}
                className={["rounded p-1.5 transition-colors", viewMode === mode ? "text-white" : "text-white/30 hover:text-white/60"].join(" ")}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── List view ───────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="max-h-[560px] overflow-y-auto divide-y divide-white/[0.04]">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-white/30">No episodes match.</p>
          ) : filtered.map((n) => {
            const meta     = metaByNum.get(n);
            const isActive = n === currentEpisode;
            const title    = meta?.title && meta.title !== `Episode ${n}` ? meta.title : null;
            const airDate  = formatAirDate(meta?.airDate);
            const servers  = serversForEpisode(n, currentAudio);
            const serverCount = servers.length;

            return (
              <div
                key={n}
                className={["px-4 py-3.5 transition-colors", isActive ? "bg-primary/10" : "hover:bg-white/[0.03]"].join(" ")}
              >
                {/* Row 1: title + AUDIO / SERVER labels */}
                <div className="flex items-start justify-between gap-3">
                  <button
                    ref={isActive ? (el) => { (activeRef as React.MutableRefObject<HTMLButtonElement | null>).current = el; } : undefined}
                    onClick={() => { onSelectEpisode(n); setSearch(""); }}
                    className="text-left"
                  >
                    <span className={["text-sm font-bold leading-tight", isActive ? "text-primary" : "text-white"].join(" ")}>
                      {n}. {title ?? `Episode ${n}`}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-3 text-[11px] text-white/30">
                    <span className="flex items-center gap-1"><Mic2 className="size-3" /> AUDIO</span>
                    <span className="flex items-center gap-1"><Zap className="size-3" /> SERVER{serverCount > 0 ? ` (${serverCount})` : ""}</span>
                  </div>
                </div>

                {/* Row 2: meta badges + controls */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {airDate && <span className="text-[11px] text-white/35">{airDate}</span>}
                    {hasSub && (
                      <span className="flex items-center gap-0.5 rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/50">
                        <Mic2 className="size-2.5" /> CC
                      </span>
                    )}
                    {hasDub && (
                      <span className="flex items-center gap-0.5 rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary/70">
                        <Mic2 className="size-2.5" /> DUB
                      </span>
                    )}
                  </div>

                  {/* Inline controls (only on active episode) */}
                  {isActive && onAudioChange && onProviderChange && (
                    <div className="flex items-center gap-1.5">
                      {/* Audio dropdown */}
                      <select
                        value={currentAudio}
                        onChange={(e) => onAudioChange(e.target.value as "sub" | "dub")}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/80 outline-none cursor-pointer hover:bg-white/15"
                      >
                        {hasSub && <option value="sub">Sub</option>}
                        {hasDub && <option value="dub">Dub</option>}
                      </select>

                      {/* Server dropdown */}
                      {servers.length > 0 && (
                        <select
                          value={selectedProvider ?? ""}
                          onChange={(e) => onProviderChange(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/80 outline-none cursor-pointer hover:bg-white/15 max-w-[100px]"
                        >
                          {servers.map((s) => (
                            <option key={s} value={s}>{providerLabel(s)}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── Grid view ───────────────────────────────────────────────────── */}
      {viewMode === "grid" && (
        <div className="max-h-[560px] overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-white/30">No episodes match.</p>
          ) : (
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
              {filtered.map((n) => {
                const isActive = n === currentEpisode;
                return (
                  <button
                    key={n}
                    ref={isActive ? (el) => { (activeRef as React.MutableRefObject<HTMLButtonElement | null>).current = el; } : undefined}
                    onClick={() => { onSelectEpisode(n); setSearch(""); }}
                    className={[
                      "flex items-center justify-center rounded-lg py-2.5 text-sm font-bold transition-colors",
                      isActive
                        ? "bg-primary text-black shadow-lg shadow-primary/30"
                        : "bg-white/10 text-white/65 hover:bg-white/15 hover:text-white",
                    ].join(" ")}
                  >
                    {isActive ? <Play className="size-3.5 fill-black" /> : n}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Image view ──────────────────────────────────────────────────── */}
      {viewMode === "image" && (
        <div className="max-h-[560px] overflow-y-auto divide-y divide-white/[0.04]">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-white/30">No episodes match.</p>
          ) : filtered.map((n) => {
            const meta     = metaByNum.get(n);
            const isActive = n === currentEpisode;
            const thumb    = meta?.thumbnail ?? meta?.image ?? null;
            const title    = meta?.title && meta.title !== `Episode ${n}` ? meta.title : `Episode ${n}`;
            const airDate  = formatAirDate(meta?.airDate);

            return (
              <button
                key={n}
                ref={isActive ? (el) => { (activeRef as React.MutableRefObject<HTMLButtonElement | null>).current = el; } : undefined}
                onClick={() => { onSelectEpisode(n); setSearch(""); }}
                className={["flex w-full gap-0 text-left transition-colors", isActive ? "bg-primary/10" : "hover:bg-white/[0.04]"].join(" ")}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-[38%] shrink-0 bg-white/5">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <span className="text-[10px] font-bold text-white/20">EP {pad2(n)}</span>
                    </div>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white/90">
                    EP {pad2(n)}
                  </span>
                  {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                      <Play className="size-5 fill-primary text-primary" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col justify-between px-3 py-2.5">
                  <div>
                    <p className={["line-clamp-2 text-xs font-bold leading-snug", isActive ? "text-primary" : "text-white"].join(" ")}>
                      {title}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {hasSub && <Mic2 className="size-3 text-white/40" />}
                      {hasDub && <Mic2 className="size-3 text-primary/60" />}
                    </div>
                    {airDate && <span className="text-[10px] text-white/30">{airDate}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
