"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

type Status = "operational" | "degraded" | "down" | "loading";

interface ServiceResult {
  service: string;
  status: "operational" | "degraded" | "down";
  latency: number | null;
}

const STATUS_META: Record<Status, { label: string; color: string; dot: string }> = {
  operational: {
    label: "Operational",
    color: "text-emerald-500",
    dot: "bg-emerald-500",
  },
  degraded: {
    label: "Degraded",
    color: "text-yellow-500",
    dot: "bg-yellow-500",
  },
  down: {
    label: "Down",
    color: "text-red-500",
    dot: "bg-red-500",
  },
  loading: {
    label: "Checking…",
    color: "text-gray-400 dark:text-white/40",
    dot: "bg-gray-300 dark:bg-white/20 animate-pulse",
  },
};

const INITIAL_SERVICES = [
  "Website",
  "AniList",
  "MyAnimeList",
  "Streaming Server",
  "Player",
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
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const data: ServiceResult[] = await res.json();
      setServices(data);
      setCheckedAt(new Date());
    } catch {
      // leave stale data visible
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, []);

  const overall: Status =
    loading && services.length === 0
      ? "loading"
      : services.length === 0
        ? "loading"
        : overallStatus(services);

  const meta = STATUS_META[overall];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-2xl px-6 pb-20 pt-10 sm:px-10">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">System Status</h1>
            {checkedAt && (
              <p className="mt-1 text-xs text-gray-400 dark:text-white/40">
                Last checked{" "}
                {checkedAt.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
                {" · "}
                <button
                  onClick={refresh}
                  className="underline underline-offset-2 hover:text-gray-600 dark:hover:text-white/70 transition-colors"
                >
                  Refresh
                </button>
              </p>
            )}
          </div>

          {/* Overall pill */}
          <div
            className={[
              "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold",
              overall === "operational"
                ? "bg-emerald-500/10 text-emerald-500"
                : overall === "degraded"
                  ? "bg-yellow-500/10 text-yellow-500"
                  : overall === "down"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-white/40",
            ].join(" ")}
          >
            <span
              className={["size-2 rounded-full", meta.dot].join(" ")}
            />
            {overall === "operational"
              ? "All Systems Operational"
              : overall === "degraded"
                ? "Partial Degradation"
                : overall === "down"
                  ? "Service Disruption"
                  : "Checking…"}
          </div>
        </div>

        {/* Service rows */}
        <div className="divide-y divide-gray-100 dark:divide-white/10 rounded-xl border border-gray-200 dark:border-white/10 bg-card overflow-hidden">
          {(loading && services.length === 0 ? INITIAL_SERVICES : services.map((s) => s.service)).map(
            (name, i) => {
              const svc = services.find((s) => s.service === name);
              const status: Status = svc ? svc.status : "loading";
              const m = STATUS_META[status];
              return (
                <div
                  key={name}
                  className="flex items-center justify-between px-5 py-4"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className="text-sm font-medium text-foreground">{name}</span>
                  <div className="flex items-center gap-3">
                    {svc?.latency != null && svc.latency > 0 && (
                      <span className="text-xs text-gray-400 dark:text-white/30 tabular-nums">
                        {svc.latency}ms
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className={["size-2 rounded-full", m.dot].join(" ")} />
                      <span className={["text-xs font-medium", m.color].join(" ")}>
                        {m.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>

        <p className="mt-6 text-xs text-gray-400 dark:text-white/30 text-center">
          Status refreshes automatically every 60 seconds.
        </p>
      </div>

      <Footer />
    </div>
  );
}
