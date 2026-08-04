"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Plus, Check, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import type { AnimeDetail } from "@/lib/anilist";
import { cn } from "@/lib/utils";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: { year: number | null; month: number | null; day: number | null }): string | null {
  if (!d.year || !d.month || !d.day) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" })
      .format(new Date(d.year, d.month - 1, d.day));
  } catch { return null; }
}

function animeStatus(s: string | null): { label: string; cls: string } {
  switch (s) {
    case "FINISHED":          return { label: "Finished",       cls: "text-emerald-400" };
    case "RELEASING":         return { label: "Releasing",      cls: "text-primary"     };
    case "NOT_YET_RELEASED":  return { label: "Not Yet Aired",  cls: "text-yellow-400"  };
    case "CANCELLED":         return { label: "Cancelled",      cls: "text-red-400"     };
    case "HIATUS":            return { label: "Hiatus",         cls: "text-orange-400"  };
    default:                  return { label: s ?? "Unknown",   cls: "text-white/60"    };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

// ─── Quick list dropdown ───────────────────────────────────────────────────────

type ListStatus = "WATCHING" | "PLAN_TO_WATCH" | "COMPLETED" | "DROPPED" | "ON_HOLD";

const LIST_OPTIONS: { key: ListStatus; label: string }[] = [
  { key: "WATCHING",      label: "Watching"      },
  { key: "PLAN_TO_WATCH", label: "Plan to Watch" },
  { key: "COMPLETED",     label: "Completed"     },
  { key: "DROPPED",       label: "Dropped"       },
  { key: "ON_HOLD",       label: "On Hold"       },
];

function QuickListButton({ animeId }: { animeId: number }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [status, setStatus]   = useState<ListStatus | null>(null);
  const [open, setOpen]       = useState(false);
  const [busy, setBusy]       = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !currentUser) return;
    fetch(`/api/anime/${animeId}/status?username=${encodeURIComponent(currentUser)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setStatus(d.status); })
      .catch(() => {});
  }, [mounted, currentUser, animeId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function select(key: ListStatus | null) {
    if (!currentUser) { window.location.href = "/login"; return; }
    if (busy) return;
    const prev = status;
    setBusy(true);
    setStatus(key);
    setOpen(false);
    try {
      const res  = await fetch(`/api/anime/${animeId}/status`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: currentUser, status: key }),
      });
      const json = await res.json() as { status: ListStatus | null };
      if (!res.ok) setStatus(prev);
      else setStatus(json.status);
    } catch {
      setStatus(prev);
    } finally {
      setBusy(false);
    }
  }

  const label = status ? (LIST_OPTIONS.find((o) => o.key === status)?.label ?? "In List") : "Add";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors",
          status
            ? "border border-primary/30 bg-primary/10 text-primary"
            : "border border-white/10 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white",
        )}
      >
        {status ? <Check className="size-3" /> : <Plus className="size-3" />}
        {label}
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 min-w-[148px] rounded-lg border border-white/[0.08] bg-[#1c1c1c] py-1 shadow-2xl">
          {LIST_OPTIONS.map(({ key, label }) => {
            const active = status === key;
            return (
              <button
                key={key}
                onClick={() => select(active ? null : key)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-white/[0.06]",
                  active ? "font-semibold text-primary" : "text-white/70",
                )}
              >
                <span className="size-3 shrink-0">
                  {active && <Check className="size-3" />}
                </span>
                {label}
              </button>
            );
          })}
          {status && (
            <>
              <div className="my-1 border-t border-white/[0.06]" />
              <button
                onClick={() => select(null)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-red-400/80 transition-colors hover:bg-white/[0.06]"
              >
                <span className="size-3 shrink-0" />
                Remove from list
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface AnimeInfoCardProps {
  detail:  AnimeDetail;
  animeId: number;
}

export function AnimeInfoCard({ detail, animeId }: AnimeInfoCardProps) {
  const cover       = detail.coverImage.extraLarge ?? detail.coverImage.large;
  const title       = detail.title.english ?? detail.title.romaji;
  const native      = detail.title.native ?? null;
  const description = detail.description ? stripHtml(detail.description) : null;
  const studio      = detail.studios.nodes[0]?.name ?? null;

  const startDate = formatDate(detail.startDate);
  const endDate   = formatDate(detail.endDate);
  const { label: statusLabel, cls: statusCls } = animeStatus(detail.status);

  const trailerUrl = detail.trailer?.site === "youtube"
    ? `https://www.youtube.com/watch?v=${detail.trailer.id}`
    : null;

  const officialSite = detail.externalLinks.find(
    (l) => l.type === "INFO" || l.site.toLowerCase().includes("official"),
  );

  const season = detail.season
    ? detail.season.charAt(0) + detail.season.slice(1).toLowerCase()
    : null;

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#111]">

      {/* ── Cover + title/genres/description ─────────────────────────────── */}
      <div className="flex gap-4 p-4">
        {/* Cover */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={title}
          className="h-40 w-[104px] shrink-0 rounded-lg object-cover shadow-lg sm:h-48 sm:w-[120px]"
        />

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold leading-snug text-white sm:text-lg">{title}</h1>
          {native && <p className="mt-0.5 text-[12px] text-white/40">{native}</p>}

          {detail.genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {detail.genres.slice(0, 5).map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-[#02a9ff]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#02a9ff]"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {description && (
            <p className="mt-2.5 line-clamp-4 rounded-lg bg-white/[0.04] px-3 py-2 text-[11px] leading-relaxed text-white/50">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="mx-4 border-t border-white/[0.05]" />

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {trailerUrl && (
          <a
            href={trailerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white/70 transition-colors hover:bg-white/15 hover:text-white"
          >
            <Play className="size-3 fill-white/70" /> Trailer
          </a>
        )}

        <QuickListButton animeId={animeId} />

        <a
          href={`https://anilist.co/anime/${animeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center rounded-md bg-[#02a9ff]/15 px-3 py-1.5 text-[11px] font-black tracking-wide text-[#02a9ff] transition-colors hover:bg-[#02a9ff]/25"
        >
          A.
        </a>

        {detail.idMal && (
          <a
            href={`https://myanimelist.net/anime/${detail.idMal}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center rounded-md border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white/70 transition-colors hover:bg-white/15 hover:text-white"
          >
            MAL
          </a>
        )}
      </div>

      <div className="mx-4 border-t border-white/[0.05]" />

      {/* ── Metadata grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[12px]">
        {/* Left */}
        <div className="space-y-2">
          <MetaRow label="Format"   value={detail.format ?? "—"} />
          <MetaRow label="Status"   value={statusLabel}           valueCls={statusCls} />
          <MetaRow label="Episodes" value={detail.episodes ? String(detail.episodes) : "—"} />
          {detail.averageScore != null && (
            <div className="flex items-baseline gap-1.5">
              <span className="shrink-0 text-white/40">Rating:</span>
              <span className="font-semibold text-white/85">
                {detail.averageScore}
                <span className="font-normal text-white/35"> /100</span>
              </span>
            </div>
          )}
          {detail.duration && <MetaRow label="Duration" value={`${detail.duration} min`} />}
          {season           && <MetaRow label="Season"   value={season} />}
        </div>

        {/* Right */}
        <div className="space-y-2">
          {startDate    && <MetaRow label="Start Date"    value={startDate} />}
          {endDate      && <MetaRow label="End Date"      value={endDate} />}
          {studio       && <MetaRow label="Studios"       value={studio}     bold />}
          {detail.source && <MetaRow label="Source"       value={detail.source.replace(/_/g, " ")} />}
          {officialSite && (
            <div className="flex items-baseline gap-1.5">
              <span className="shrink-0 text-white/40">Official Site:</span>
              <a
                href={officialSite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-semibold text-[#02a9ff] hover:underline"
              >
                {officialSite.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  label, value, valueCls, bold,
}: {
  label: string; value: string; valueCls?: string; bold?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="shrink-0 text-white/40">{label}:</span>
      <span className={cn("font-semibold", bold ? "text-primary" : (valueCls ?? "text-white/85"))}>
        {value}
      </span>
    </div>
  );
}
