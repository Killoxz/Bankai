"use client";

import { useEffect, useRef, useState } from "react";
import {
  type LucideIcon,
  RefreshCw,
  Globe,
  Server,
  MonitorPlay,
  Library,
  ListChecks,
  MessagesSquare,
} from "lucide-react";
import { Footer } from "@/components/layout/footer";

type Status = "operational" | "degraded" | "down" | "loading";

interface ServiceResult {
  service: string;
  status: "operational" | "degraded" | "down";
  latency: number | null;
}

const STATUS_META: Record<Status, { label: string; color: string; dot: string }> = {
  operational: { label: "Operational", color: "text-emerald-500", dot: "bg-emerald-500" },
  degraded:    { label: "Degraded",    color: "text-yellow-500", dot: "bg-yellow-500"  },
  down:        { label: "Down",        color: "text-red-500",    dot: "bg-red-500"     },
  loading:     { label: "Checking…",   color: "text-gray-400 dark:text-white/40", dot: "bg-gray-300 dark:bg-white/20 animate-pulse" },
};

const SERVICE_ICONS: Record<string, LucideIcon> = {
  Website:             Globe,
  "Streaming Server":  Server,
  Player:              MonitorPlay,
  AniList:             Library,
  "My List":           ListChecks,
  "Community Comments": MessagesSquare,
};

const ORDERED_SERVICES = [
  "Website",
  "Streaming Server",
  "Player",
  "AniList",
  "My List",
  "Community Comments",
];

const REFRESH_INTERVAL = 60;

function overallStatus(services: ServiceResult[]): Status {
  if (services.some((s) => s.status === "down")) return "down";
  if (services.some((s) => s.status === "degraded")) return "degraded";
  return "operational";
}

export default function StatusPage() {
  const [services, setServices]   = useState<ServiceResult[]>([]);
  const [loading, setLoading]     = useState(true);
  const [spinning, setSpinning]   = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const countdownRef = useRef(REFRESH_INTERVAL);

  async function refresh(manual = false) {
    if (manual) setSpinning(true);
    setLoading(true);
    countdownRef.current = REFRESH_INTERVAL;
    setCountdown(REFRESH_INTERVAL);
    try {
      const res  = await fetch("/api/status", { cache: "no-store" });
      const data: ServiceResult[] = await res.json();
      setServices(data);
      setCheckedAt(new Date());
    } catch { /* keep stale data */ } finally {
      setLoading(false);
      if (manual) setTimeout(() => setSpinning(false), 600);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(() => refresh(), REFRESH_INTERVAL * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      countdownRef.current = Math.max(0, countdownRef.current - 1);
      setCountdown(countdownRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const overall = loading && services.length === 0 ? "loading" : overallStatus(services);
  const meta    = STATUS_META[overall];

  const overallLabel =
    overall === "operational" ? "All Systems Operational" :
    overall === "degraded"    ? "Partial Degradation"     :
    overall === "down"        ? "Service Disruption"      : "Checking…";

  const barColor =
    overall === "operational" ? "bg-emerald-500" :
    overall === "degraded"    ? "bg-yellow-500"  :
    overall === "down"        ? "bg-red-500"      : "bg-gray-400 dark:bg-white/30";

  return (
    <div className="min-h-screen bg-background">

      <div className="mx-auto max-w-xl px-6 pb-20 pt-12 sm:px-8 md:pt-20">

        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">System Status</h1>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={[
                "size-2.5 rounded-full shrink-0",
                overall === "operational" ? "bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.5)]" :
                overall === "degraded"    ? "bg-yellow-500  shadow-[0_0_6px_2px_rgba(234,179,8,0.5)]"  :
                overall === "down"        ? "bg-red-500     shadow-[0_0_6px_2px_rgba(239,68,68,0.5)] animate-pulse" :
                                            "bg-gray-300 dark:bg-white/20 animate-pulse",
              ].join(" ")}
            />
            <span className={["text-sm font-semibold", meta.color].join(" ")}>
              {overallLabel}
            </span>
          </div>
        </div>

        {/* ── Service list ── */}
        <div className="divide-y divide-gray-100 dark:divide-white/10 rounded-2xl border border-gray-200 dark:border-white/10 bg-card overflow-hidden">
          {ORDERED_SERVICES.map((name) => {
            const svc    = services.find((s) => s.service === name);
            const status: Status = (loading && !svc) ? "loading" : svc ? svc.status : "loading";
            const m      = STATUS_META[status];
            const Icon   = SERVICE_ICONS[name];

            return (
              <div key={name} className="flex items-center gap-3 px-5 py-3.5">
                {/* Icon */}
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50">
                  {Icon && <Icon className="size-4" />}
                </div>

                {/* Name */}
                <span className="flex-1 text-sm font-medium text-foreground">{name}</span>

                {/* Latency */}
                {svc?.latency != null && svc.latency > 0 && (
                  <span className="text-xs tabular-nums text-gray-400 dark:text-white/30">
                    {svc.latency} ms
                  </span>
                )}

                {/* Status */}
                <div className="flex items-center gap-1.5">
                  <span className={["size-2 rounded-full shrink-0", m.dot].join(" ")} />
                  <span className={["text-xs font-semibold w-20 text-right", m.color].join(" ")}>
                    {m.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Countdown ── */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-gray-400 dark:text-white/30">
            <span>
              {checkedAt
                ? `Updated at ${checkedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : "Checking…"}
            </span>
            <div className="flex items-center gap-2">
              <span className="tabular-nums">{countdown}s</span>
              <button
                onClick={() => refresh(true)}
                disabled={loading}
                className="flex items-center gap-1 transition-colors hover:text-gray-600 dark:hover:text-white/60 disabled:opacity-40"
                aria-label="Refresh"
              >
                <RefreshCw className={["size-3", spinning ? "animate-spin" : ""].join(" ")} />
              </button>
            </div>
          </div>
          <div className="h-0.5 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div
              className={["h-full rounded-full transition-all duration-1000 ease-linear", barColor].join(" ")}
              style={{ width: `${(countdown / REFRESH_INTERVAL) * 100}%` }}
            />
          </div>
        </div>

      </div>

      <Footer />
    </div>
  );
}
