"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Trash2, Clock } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useHistoryStore, type HistoryEntry } from "@/store/history-store";
import { usePlayerStore } from "@/store/player-store";
import { useMounted } from "@/hooks/use-mounted";
import { preferredTitle } from "@/lib/utils";

const DAY = 86400_000;

function groupOf(ts: number): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= startOfToday) return "Today";
  if (ts >= startOfToday - DAY) return "Yesterday";
  if (ts >= startOfToday - 7 * DAY) return "This Week";
  return "Older";
}

const ORDER = ["Today", "Yesterday", "This Week", "Older"];

export function HistoryView() {
  const mounted = useMounted();
  const entries = useHistoryStore((s) => s.entries);
  const remove = useHistoryStore((s) => s.remove);
  const clear = useHistoryStore((s) => s.clear);
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);

  const groups = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>();
    for (const e of entries) {
      const g = groupOf(e.updatedAt);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(e);
    }
    return ORDER.filter((g) => map.has(g)).map((g) => ({ group: g, items: map.get(g)! }));
  }, [entries]);

  if (!mounted) return null;

  if (entries.length === 0) {
    return (
      <div className="grid place-items-center gap-3 rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">
        <Clock className="size-10" />
        <p>No watch history yet. Start watching something!</p>
        <Link href="/trending" className={`${buttonVariants()} mt-2`}>Browse trending</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-destructive" onClick={clear}>
          <Trash2 className="size-4" /> Clear all history
        </Button>
      </div>

      {groups.map(({ group, items }) => (
        <section key={group} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{group}</h2>
          <div className="space-y-2">
            {items.map((e) => {
              const pct = e.duration ? Math.min(100, (e.progress / e.duration) * 100) : 0;
              return (
                <div
                  key={`${e.anime.id}-${e.episode}`}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-2.5"
                >
                  <Link href={`/watch/${e.anime.slug}?ep=${e.episode}`} className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {(e.anime.bannerImage || e.anime.coverImage) && (
                      <Image src={e.anime.bannerImage || e.anime.coverImage} alt="" fill sizes="112px" className="object-cover" />
                    )}
                    <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                      <Play className="size-6 fill-white text-white" />
                    </div>
                    <div className="absolute bottom-0 left-0 h-1 bg-primary" style={{ width: `${pct}%` }} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/anime/${e.anime.slug}`} className="line-clamp-1 font-medium hover:text-primary">
                      {preferredTitle(e.anime.title, titleLanguage)}
                    </Link>
                    <p className="text-sm text-muted-foreground">Episode {e.episode} · {Math.round(pct)}% watched</p>
                  </div>
                  <Link href={`/watch/${e.anime.slug}?ep=${e.episode}`} className={buttonVariants({ size: "sm", variant: "glass" })}>Resume</Link>
                  <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => remove(e.anime.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
