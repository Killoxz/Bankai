"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Trash2, Clock } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

interface HistoryEntry {
  id: string;
  animeId: string;
  episodeNumber: number;
  progress: number;
  duration: number;
  completed: boolean;
  watchedAt: string;
  Anime: {
    id: string;
    title: string;
    coverImage: string | null;
    episodes: number | null;
    format: string | null;
    seasonYear: number | null;
    genres: string[];
  };
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function progressPct(entry: HistoryEntry): number {
  if (entry.completed) return 100;
  if (!entry.duration) return 0;
  return Math.min(100, Math.round((entry.progress / entry.duration) * 100));
}

export function HistoryView() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    fetch(`/api/history?username=${encodeURIComponent(currentUser)}`)
      .then((r) => r.json())
      .then((json) => setEntries(json.history ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [mounted, currentUser, router]);

  async function clearAll() {
    if (!currentUser || !confirm("Clear your entire watch history? This cannot be undone.")) return;
    await fetch(`/api/history?username=${encodeURIComponent(currentUser)}`, {
      method: "DELETE",
    });
    setEntries([]);
  }

  if (!mounted || loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
      </div>
    );
  }

  if (!currentUser) return null;

  // Group by date
  const groups: Record<string, HistoryEntry[]> = {};
  for (const e of entries) {
    const day = new Date(e.watchedAt).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!groups[day]) groups[day] = [];
    groups[day].push(e);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-[1000px] px-6 pb-16 pt-6 sm:px-10 md:pt-20">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Watch History</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-white/45">{entries.length} entries</p>
          </div>
          {entries.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/8"
            >
              <Trash2 className="size-4" />
              Clear all
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-24 text-center"
          >
            <Clock className="size-12 text-gray-300 dark:text-white/20" />
            <p className="text-sm text-muted-foreground">Your watch history is empty.</p>
            <Link
              href="/"
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110"
            >
              Start Watching
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-10">
            {Object.entries(groups).map(([day, dayEntries]) => (
              <section key={day}>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {day}
                </h2>
                <div className="space-y-2">
                  {dayEntries.map((entry, i) => {
                    const animeNumId = entry.Anime.id.replace(/^anilist:/, "");
                    const pct = progressPct(entry);
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="group flex items-center gap-4 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent"
                      >
                        {/* Cover */}
                        <Link
                          href={`/watch/${animeNumId}?ep=${entry.episodeNumber}`}
                          className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-white/10"
                        >
                          {entry.Anime.coverImage && (
                            <Image
                              src={entry.Anime.coverImage}
                              alt={entry.Anime.title}
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          )}
                        </Link>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <Link href={`/anime/${animeNumId}`}>
                            <p className="line-clamp-1 text-sm font-semibold text-card-foreground hover:text-primary">
                              {entry.Anime.title}
                            </p>
                          </Link>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Episode {entry.episodeNumber}
                            {entry.Anime.episodes ? ` / ${entry.Anime.episodes}` : ""}
                            {" · "}
                            {timeAgo(entry.watchedAt)}
                          </p>
                          {/* Progress bar */}
                          <div className="mt-2 h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-white/15">
                            <div
                              className={[
                                "h-full rounded-full transition-all",
                                entry.completed ? "bg-primary" : "bg-white/60",
                              ].join(" ")}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {entry.completed && (
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              Completed
                            </p>
                          )}
                        </div>

                        {/* Watch button */}
                        <Link
                          href={`/watch/${animeNumId}?ep=${entry.episodeNumber}`}
                          className="hidden shrink-0 items-center gap-1.5 rounded-full bg-gray-100 dark:bg-white/10 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-white transition-colors hover:bg-primary hover:text-black sm:flex"
                        >
                          <Play className="size-3 fill-current" />
                          {entry.completed ? "Rewatch" : "Continue"}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
