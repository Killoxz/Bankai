"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search, LayoutList, LayoutGrid, Image as ImageIcon, ChevronDown,
  Mic2, Zap, Play,
} from "lucide-react";
import { providerLabel, type EpisodesMap, type ProviderEpisode } from "./episode-utils";
import { useSettingsStore } from "@/store/settings-store";
import { SelectMenu } from "@/components/ui/select-menu";

interface EpisodeListProps {
  totalEpisodes: number;
  currentEpisode: number;
  onSelectEpisode: (ep: number) => void;
  episodeData: ProviderEpisode[];
  hasSub: boolean;
  hasDub: boolean;
  currentAudio: "sub" | "dub";
  providersData?: EpisodesMap | null;
  selectedProvider?: string | null;
  onProviderChange?: (p: string) => void;
  onAudioChange?: (a: "sub" | "dub") => void;
}

const BATCH = 50;
const EXCLUDED = new Set(["allmanga"]);

function pad2(n: number) { return String(n).padStart(2, "0"); }
void pad2; // used externally

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

  function serversForEpisode(n: number, audio: "sub" | "dub"): string[] {
    if (!providersData) return [];
    return Object.keys(providersData).filter((name) => {
      if (EXCLUDED.has(name)) return false;
      const d = providersData[name];
      return !d?.error && (d?.episodes?.[audio] ?? []).some((e) => e.number === n);
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {/* Batch range picker */}
        <div className="relative">
          <button
            onClick={() => setBatchOpen((o) => !o)}
            className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            {batchStart}–{batchEnd}
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>
          {batchOpen && (
            <div className="absolute left-0 top-9 z-30 max-h-40 w-28 overflow-y-auto rounded-lg border border-border bg-popover py-1 shadow-2xl">
              {Array.from({ length: totalBatches }, (_, i) => {
                const s = i * BATCH + 1;
                const e = Math.min(s + BATCH - 1, totalEpisodes);
                return (
                  <button
                    key={s}
                    onClick={() => { setBatchStart(s); setBatchOpen(false); setSearch(""); }}
                    className={["block w-full px-3 py-1.5 text-left text-xs hover:bg-accent", s === batchStart ? "text-primary" : "text-popover-foreground/80"].join(" ")}
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
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter episodes…"
            className="w-full rounded-md border border-border bg-muted py-1.5 pl-8 pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
          />
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
          {([
            { mode: "list",  Icon: LayoutList },
            { mode: "grid",  Icon: LayoutGrid },
            { mode: "image", Icon: ImageIcon },
          ] as const).map(({ mode, Icon }) => (
            <button
              key={mode}
              onClick={() => changeView(mode)}
              aria-label={mode}
              className={[
                "rounded-md p-1.5 transition-colors",
                viewMode === mode
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {/* ── List view ───────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="max-h-[560px] overflow-y-auto divide-y divide-border">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No episodes match.</p>
          ) : filtered.map((n) => {
            const meta        = metaByNum.get(n);
            const isActive    = n === currentEpisode;
            const title       = meta?.title && meta.title !== `Episode ${n}` ? meta.title : null;
            const airDate     = formatAirDate(meta?.airDate);
            const servers     = serversForEpisode(n, currentAudio);
            const serverCount = servers.length;
            const description = meta?.description ?? null;
            const isFiller    = meta?.filler === true;

            return (
              <div
                key={n}
                className={["px-4 py-3.5 transition-colors", isActive ? "bg-primary/10" : "hover:bg-accent/40"].join(" ")}
              >
                {/* Row 1: title (left) + controls always on right (dropdowns for active, labels for inactive) */}
                <div className={["flex gap-3", description ? "items-start" : "items-center", "justify-between"].join(" ")}>
                  <button
                    ref={isActive ? (el) => { (activeRef as React.MutableRefObject<HTMLButtonElement | null>).current = el; } : undefined}
                    onClick={() => { onSelectEpisode(n); setSearch(""); }}
                    className="min-w-0 text-left"
                  >
                    <span className={["text-sm font-bold leading-tight", isActive ? "text-primary" : "text-foreground"].join(" ")}>
                      {n}. {title ?? `Episode ${n}`}
                    </span>
                    {description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
                    )}
                  </button>

                  {/* Right-side controls — dropdowns when active, text labels when not */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isActive && onAudioChange && onProviderChange ? (
                      <>
                        <SelectMenu
                          value={currentAudio}
                          options={[
                            ...(hasSub ? [{ value: "sub", label: "Sub" }] : []),
                            ...(hasDub ? [{ value: "dub", label: "Dub" }] : []),
                          ]}
                          onChange={(v) => onAudioChange(v as "sub" | "dub")}
                          icon={<Mic2 className="size-3" />}
                        />
                        {servers.length > 0 && (
                          <SelectMenu
                            value={selectedProvider ?? ""}
                            options={servers.map((s) => ({ value: s, label: providerLabel(s) }))}
                            onChange={onProviderChange}
                            icon={<Zap className="size-3" />}
                            maxHeight={180}
                          />
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Zap className="size-3" /> AUDIO</span>
                        <span className="flex items-center gap-1"><Zap className="size-3" /> SERVER{serverCount > 0 ? ` (${serverCount})` : ""}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: meta badges only */}
                {(airDate || hasSub || hasDub || isFiller) && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {airDate && <span className="text-[11px] text-muted-foreground">{airDate}</span>}
                    {hasSub && (
                      <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted-foreground">
                        CC
                      </span>
                    )}
                    {hasDub && (
                      <span className="flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        <Mic2 className="size-2.5" /> DUB
                      </span>
                    )}
                    {isFiller && (
                      <span className="rounded border border-yellow-500/40 bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-yellow-500">
                        FILLER
                      </span>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* ── Grid view ───────────────────────────────────────────────────── */}
      {viewMode === "grid" && (
        <div className="max-h-[560px] overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No episodes match.</p>
          ) : (
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
              {filtered.map((n) => {
                const isActive  = n === currentEpisode;
                const meta      = metaByNum.get(n);
                const isFiller  = meta?.filler === true;
                const gridTitle = meta?.title && meta.title !== `Episode ${n}` ? `${n}. ${meta.title}` : `Episode ${n}`;
                const gridDesc  = meta?.description ? `\n\n${meta.description}` : "";
                return (
                  <button
                    key={n}
                    title={`${gridTitle}${isFiller ? " [FILLER]" : ""}${gridDesc}`}
                    ref={isActive ? (el) => { (activeRef as React.MutableRefObject<HTMLButtonElement | null>).current = el; } : undefined}
                    onClick={() => { onSelectEpisode(n); setSearch(""); }}
                    className={[
                      "flex items-center justify-center rounded-lg py-2.5 text-sm font-bold transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : isFiller
                          ? "bg-yellow-500/15 text-yellow-500 ring-1 ring-yellow-500/30 hover:bg-yellow-500/25"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                    ].join(" ")}
                  >
                    {isActive ? <Play className="size-3.5 fill-primary-foreground" /> : n}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Image view ──────────────────────────────────────────────────── */}
      {viewMode === "image" && (
        <div className="max-h-[560px] overflow-y-auto divide-y divide-border">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No episodes match.</p>
          ) : filtered.map((n) => {
            const meta        = metaByNum.get(n);
            const isActive    = n === currentEpisode;
            const thumb       = meta?.thumbnail ?? meta?.image ?? null;
            const title       = meta?.title && meta.title !== `Episode ${n}` ? meta.title : `Episode ${n}`;
            const airDate     = formatAirDate(meta?.airDate);
            const imgDesc     = meta?.description ?? null;
            const isFiller    = meta?.filler === true;

            return (
              <button
                key={n}
                ref={isActive ? (el) => { (activeRef as React.MutableRefObject<HTMLButtonElement | null>).current = el; } : undefined}
                onClick={() => { onSelectEpisode(n); setSearch(""); }}
                className={["flex w-full text-left transition-colors", isActive ? "bg-primary/10" : "hover:bg-accent/40"].join(" ")}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-[42%] shrink-0 overflow-hidden bg-muted">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-muted">
                      <ImageIcon className="size-6 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/75 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                    EP {n}
                  </span>
                  {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary shadow-lg">
                        <Play className="size-4 translate-x-px fill-primary-foreground text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-3">
                  <p className={["line-clamp-1 text-sm font-bold leading-tight", isActive ? "text-primary" : "text-foreground"].join(" ")}>
                    {title}
                  </p>
                  {imgDesc && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{imgDesc}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      {hasSub && (
                        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted-foreground">
                          CC
                        </span>
                      )}
                      {hasDub && <Mic2 className="size-3.5 text-muted-foreground" />}
                      {isFiller && (
                        <span className="rounded border border-yellow-500/40 bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-yellow-500">
                          FILLER
                        </span>
                      )}
                    </div>
                    {airDate && <span className="text-[10px] text-muted-foreground">{airDate}</span>}
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
