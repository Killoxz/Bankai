"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, Clock, X } from "lucide-react";
import { useHistoryStore } from "@/store/history-store";
import { usePlayerStore } from "@/store/player-store";
import { useMounted } from "@/hooks/use-mounted";
import { preferredTitle } from "@/lib/utils";

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ContinueWatching() {
  const mounted = useMounted();
  const entries = useHistoryStore((s) => s.entries);
  const remove = useHistoryStore((s) => s.remove);
  const showHistory = usePlayerStore((s) => s.showHistory);
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);

  if (!mounted || entries.length === 0 || showHistory === "hide") return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
        <Clock className="size-5 text-primary" />
        Continue Watching
      </h2>
      <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {entries.slice(0, 12).map((e) => {
          const pct = e.duration ? Math.min(100, (e.progress / e.duration) * 100) : 0;
          return (
            <div key={e.anime.id} className="group relative w-80 shrink-0">
              <Link
                href={`/watch/${e.anime.slug}?ep=${e.episode}`}
                className="relative block aspect-video rounded-xl bg-muted transition-all duration-300 hover:ring-2 hover:ring-primary/50"
              >
                {/* Image clipped inside its own overflow-hidden wrapper */}
                <div className="absolute inset-0 overflow-hidden rounded-xl">
                  {(e.episodeThumbnail || e.anime.coverImage) && (
                    <Image
                      src={e.episodeThumbnail || e.anime.coverImage}
                      alt=""
                      fill
                      sizes="320px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>

                {/* Gradient for text legibility */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent rounded-xl" />

                {/* EP badge */}
                <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs text-white">
                  EP {e.episode}
                </span>

                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                  <span className="grid size-11 place-items-center rounded-full bg-primary/90 text-primary-foreground">
                    <Play className="size-5 translate-x-0.5 fill-current" />
                  </span>
                </div>

                {/* Info overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="line-clamp-1 text-sm font-semibold text-white">{preferredTitle(e.anime.title, titleLanguage)}</p>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-[10px] text-white/60">{Math.round(pct)}% watched</p>
                    {e.duration > 0 && (
                      <p className="text-[10px] text-white/60">
                        {formatTimestamp(e.progress)} / {formatTimestamp(e.duration)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
              <button
                onClick={() => remove(e.anime.id)}
                aria-label="Remove from continue watching"
                className="absolute right-2 top-2 z-10 grid size-6 place-items-center rounded-full bg-black/70 text-white opacity-0 transition hover:bg-black group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
