"use client";

import { useState } from "react";
import { Mic2, Zap, Flag, Download, Share2 } from "lucide-react";
import { providerLabel, hasAudio, type EpisodesMap, type ProviderEpisode } from "./episode-utils";

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
}

type Tab = "audio" | "server";

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
}: ServerSelectorProps) {
  const [tab, setTab] = useState<Tab>("server");

  // All providers that have this episode for the current audio
  const servers = providersData
    ? Object.entries(providersData)
        .filter(([, d]) => !d.error && (d.episodes?.[audio] ?? []).some((e) => e.number === episode))
        .map(([name]) => name)
    : [];

  const serverCount = servers.length;

  const title   = episodeMeta?.title && episodeMeta.title !== `Episode ${episode}`
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

  return (
    <div className="rounded-xl border border-white/8 bg-[#111] px-5 py-4">
      {/* ── Top row: title + tabs ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Left: episode title */}
        <div className="min-w-0">
          <h2 className="text-base font-bold text-white">
            {episode}. {title}
          </h2>
        </div>

        {/* Right: AUDIO / SERVER tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/4 p-0.5">
          <button
            onClick={() => setTab("audio")}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              tab === "audio"
                ? "bg-white/12 text-white"
                : "text-white/40 hover:text-white/70",
            ].join(" ")}
          >
            AUDIO
          </button>
          <button
            onClick={() => setTab("server")}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              tab === "server"
                ? "bg-white/12 text-white"
                : "text-white/40 hover:text-white/70",
            ].join(" ")}
          >
            SERVER
            {serverCount > 0 && (
              <span className="ml-1 text-white/40">({serverCount})</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Meta row ────────────────────────────────────────────────────────── */}
      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        {airDate && (
          <span className="text-xs text-white/40">{airDate}</span>
        )}
        {subCount > 0 && (
          <span className="flex items-center gap-1 rounded border border-white/10 px-2 py-0.5 text-[11px] font-medium text-white/60">
            <Mic2 className="size-3" />
            {subCount}
          </span>
        )}
        {dubCount > 0 && (
          <span className="flex items-center gap-1 rounded border border-white/10 px-2 py-0.5 text-[11px] font-medium text-white/60">
            <Mic2 className="size-3 text-primary" />
            {dubCount}
          </span>
        )}
      </div>

      {/* ── Controls row ────────────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">

        {/* AUDIO tab: sub/dub pills */}
        {tab === "audio" && (
          <div className="flex items-center gap-2">
            {(["sub", "dub"] as const).map((a) => {
              const available = a === "sub" ? hasSub : hasDub;
              const active    = audio === a;
              return (
                <button
                  key={a}
                  disabled={!available}
                  onClick={() => onAudioChange(a)}
                  className={[
                    "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                      : available
                      ? "bg-white/8 text-white/70 hover:bg-white/14 hover:text-white"
                      : "cursor-not-allowed bg-white/4 text-white/20",
                  ].join(" ")}
                >
                  <Mic2 className="size-4" />
                  {a === "sub" ? "Sub" : "Dub"}
                </button>
              );
            })}
          </div>
        )}

        {/* SERVER tab: provider chips */}
        {tab === "server" && (
          <div className="flex flex-wrap items-center gap-2">
            {servers.length === 0 ? (
              <p className="text-xs text-white/30">No servers available</p>
            ) : (
              servers.map((name) => {
                const isActive = name === selectedProvider;
                const isFailed = failedProviders.has(name);
                return (
                  <button
                    key={name}
                    onClick={() => onProviderChange(name)}
                    className={[
                      "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
                      isFailed
                        ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/30 line-through"
                        : isActive
                        ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                        : "bg-white/8 text-white/70 hover:bg-white/14 hover:text-white",
                    ].join(" ")}
                  >
                    <Zap className="size-3.5 shrink-0" />
                    {providerLabel(name)}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Report / Download / Share — right side */}
        <div className="ml-auto flex items-center gap-1">
          {[
            { icon: Flag,     label: "Report"   },
            { icon: Download, label: "Download" },
            { icon: Share2,   label: "Share"    },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              title={label}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white/40 transition-colors hover:bg-white/6 hover:text-white/70"
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Description ─────────────────────────────────────────────────────── */}
      {episodeMeta && (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-white/35">
          {/* Anivexa doesn't provide descriptions — placeholder */}
        </p>
      )}
    </div>
  );
}
