"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

type Status = "operational" | "degraded" | "down" | "loading";

interface ServiceResult {
  service: string;
  status: "operational" | "degraded" | "down";
  latency: number | null;
}

const STATUS_META: Record<
  Status,
  { label: string; color: string; dot: string; bg: string }
> = {
  operational: {
    label: "Operational",
    color: "text-emerald-500",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10",
  },
  degraded: {
    label: "Degraded",
    color: "text-yellow-500",
    dot: "bg-yellow-500",
    bg: "bg-yellow-500/10",
  },
  down: {
    label: "Down",
    color: "text-red-500",
    dot: "bg-red-500",
    bg: "bg-red-500/10",
  },
  loading: {
    label: "Checking…",
    color: "text-gray-400 dark:text-white/40",
    dot: "bg-gray-300 dark:bg-white/20 animate-pulse",
    bg: "bg-gray-100 dark:bg-white/5",
  },
};

const SERVICE_INFO: Record<string, { icon: string; description: string }> = {
  Website: {
    icon: "🌐",
    description:
      "The Bankai web app. If you're reading this, the website is up.",
  },
  AniList: {
    icon: "📚",
    description:
      "Supplies anime titles, cover art, descriptions, genres, and ratings shown across Bankai. Outages affect search, browse, and detail pages.",
  },
  MyAnimeList: {
    icon: "⭐",
    description:
      "Powers the MAL score shown on anime detail pages. If down, only the AniList score is shown.",
  },
  "Streaming Server": {
    icon: "📡",
    description:
      "The backend that fetches episode sources. Required for loading any episode list or starting playback.",
  },
  Player: {
    icon: "▶️",
    description:
      "The in-browser video player that streams episodes. Depends on the Streaming Server — if the server is down, the player cannot load content.",
  },
  "Community Comments": {
    icon: "💬",
    description:
      "The database that stores user comments and reviews on anime pages. If down, comments will not load or post.",
  },
};

const REFRESH_INTERVAL = 60;

const ORDERED_SERVICES = [
  "Website",
  "Streaming Server",
  "Player",
  "AniList",
  "MyAnimeList",
  "Community Comments",
];

function overallStatus(services: ServiceResult[]): Status {
  if (services.some((s) => s.status === "down")) return "down";
  if (services.some((s) => s.status === "degraded")) return "degraded";
  return "operational";
}

export default function StatusPage() {
  const [services, setServices] = useState<ServiceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const countdownRef = useRef(REFRESH_INTERVAL);

  async function refresh(manual = false) {
    if (manual) setSpinning(true);
    setLoading(true);
    countdownRef.current = REFRESH_INTERVAL;
    setCountdown(REFRESH_INTERVAL);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const data: ServiceResult[] = await res.json();
      setServices(data);
      setCheckedAt(new Date());
    } catch {
      // leave stale data visible
    } finally {
      setLoading(false);
      if (manual) setTimeout(() => setSpinning(false), 600);
    }
  }

  // Auto-refresh every 60 s
  useEffect(() => {
    refresh();
    const refreshId = setInterval(() => refresh(), REFRESH_INTERVAL * 1000);
    return () => clearInterval(refreshId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown ticker
  useEffect(() => {
    const tickId = setInterval(() => {
      countdownRef.current = Math.max(0, countdownRef.current - 1);
      setCountdown(countdownRef.current);
    }, 1000);
    return () => clearInterval(tickId);
  }, []);

  const overall: Status =
    loading && services.length === 0 ? "loading" : overallStatus(services);

  const meta = STATUS_META[overall];

  const overallLabel =
    overall === "operational"
      ? "All Systems Operational"
      : overall === "degraded"
        ? "Partial Degradation"
        : overall === "down"
          ? "Service Disruption"
          : "Checking…";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-2xl px-6 pb-20 pt-10 sm:px-10">

        {/* ── Overall banner ── */}
        <div
          className={[
            "mb-8 rounded-2xl border p-6",
            overall === "operational"
              ? "border-emerald-500/20 bg-emerald-500/5"
              : overall === "degraded"
                ? "border-yellow-500/20 bg-yellow-500/5"
                : overall === "down"
                  ? "border-red-500/20 bg-red-500/5"
                  : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={[
                  "size-3 rounded-full shrink-0",
                  overall === "operational"
                    ? "bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.4)]"
                    : overall === "degraded"
                      ? "bg-yellow-500 shadow-[0_0_8px_2px_rgba(234,179,8,0.4)]"
                      : overall === "down"
                        ? "bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.4)] animate-pulse"
                        : "bg-gray-300 dark:bg-white/20 animate-pulse",
                ].join(" ")}
              />
              <div>
                <p className={["text-lg font-bold", meta.color].join(" ")}>
                  {overallLabel}
                </p>
                <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
                  {overall === "operational" &&
                    "All Bankai services are running normally."}
                  {overall === "degraded" &&
                    "Some services are responding slowly. You may notice delays."}
                  {overall === "down" &&
                    "One or more services are unreachable. Some features may be unavailable."}
                  {overall === "loading" && "Running live checks on all services…"}
                </p>
              </div>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => refresh(true)}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-white/60 transition hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw
                className={["size-3.5 shrink-0", spinning ? "animate-spin" : ""].join(" ")}
              />
              Refresh
            </button>
          </div>

          {/* Countdown bar */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 dark:text-white/30">
                Next auto-refresh
              </span>
              <span className="text-[11px] tabular-nums font-medium text-gray-500 dark:text-white/40">
                {countdown}s
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
              <div
                className={[
                  "h-full rounded-full transition-all duration-1000 ease-linear",
                  overall === "operational"
                    ? "bg-emerald-500"
                    : overall === "degraded"
                      ? "bg-yellow-500"
                      : overall === "down"
                        ? "bg-red-500"
                        : "bg-gray-400 dark:bg-white/30",
                ].join(" ")}
                style={{ width: `${(countdown / REFRESH_INTERVAL) * 100}%` }}
              />
            </div>
          </div>

          {checkedAt && (
            <p className="mt-3 text-[11px] text-gray-400 dark:text-white/30">
              Last checked at{" "}
              {checkedAt.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          )}
        </div>

        {/* ── Legend ── */}
        <div className="mb-6 flex flex-wrap gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-card px-5 py-3.5">
          <p className="w-full text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30 mb-0.5">
            Status key
          </p>
          {(["operational", "degraded", "down"] as const).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className={["size-2 rounded-full shrink-0", STATUS_META[s].dot].join(" ")} />
              <div>
                <span className={["text-xs font-semibold", STATUS_META[s].color].join(" ")}>
                  {STATUS_META[s].label}
                </span>
                <span className="ml-1.5 text-xs text-gray-400 dark:text-white/30">
                  {s === "operational" && "— responding normally"}
                  {s === "degraded" && "— slow response (>2 s)"}
                  {s === "down" && "— unreachable"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Service rows ── */}
        <div className="divide-y divide-gray-100 dark:divide-white/10 rounded-xl border border-gray-200 dark:border-white/10 bg-card overflow-hidden">
          {ORDERED_SERVICES.map((name, i) => {
            const svc = services.find((s) => s.service === name);
            const status: Status = loading && !svc ? "loading" : svc ? svc.status : "loading";
            const m = STATUS_META[status];
            const info = SERVICE_INFO[name];

            return (
              <div
                key={name}
                className="flex items-center gap-4 px-5 py-4"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Icon */}
                <span className="text-xl shrink-0 select-none" aria-hidden>
                  {info?.icon}
                </span>

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{name}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-white/40 leading-snug">
                    {info?.description}
                  </p>
                </div>

                {/* Latency + status */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={["size-2 rounded-full shrink-0", m.dot].join(" ")} />
                    <span className={["text-xs font-semibold", m.color].join(" ")}>
                      {m.label}
                    </span>
                  </div>
                  {svc?.latency != null && svc.latency > 0 && (
                    <span className="text-[11px] text-gray-400 dark:text-white/30 tabular-nums">
                      {svc.latency} ms
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── What affects you ── */}
        <div className="mt-6 rounded-xl border border-gray-200 dark:border-white/10 bg-card px-5 py-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">
            What each service affects
          </p>
          <ul className="space-y-2 text-xs text-gray-500 dark:text-white/50 leading-relaxed">
            <li>
              <span className="font-medium text-foreground">Streaming Server / Player down</span>
              {" "}— Episodes will not load. Browsing and search still work.
            </li>
            <li>
              <span className="font-medium text-foreground">AniList down</span>
              {" "}— Anime details, artwork, and descriptions may not load or may be stale.
            </li>
            <li>
              <span className="font-medium text-foreground">MyAnimeList down</span>
              {" "}— MAL scores will not appear on detail pages. Everything else is unaffected.
            </li>
            <li>
              <span className="font-medium text-foreground">Community Comments down</span>
              {" "}— Reviews and comments sections will not load. Watching and browsing still work.
            </li>
          </ul>
        </div>

      </div>

      <Footer />
    </div>
  );
}
