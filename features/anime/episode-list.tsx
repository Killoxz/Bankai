"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Play, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEpisodes } from "@/features/anime/use-anime";
import { useHistoryStore } from "@/store/history-store";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

export function EpisodeList({
  animeId,
  slug,
  layout = "grid",
  currentEpisode,
}: {
  animeId: string;
  slug: string;
  layout?: "grid" | "list";
  currentEpisode?: number;
}) {
  const { data: episodes, isLoading } = useEpisodes(animeId);
  const [term, setTerm] = useState("");
  const [hideFiller, setHideFiller] = useState(false);
  const mounted = useMounted();
  const history = useHistoryStore((s) => s.getFor(animeId));

  const filtered = useMemo(() => {
    let eps = episodes ?? [];
    if (hideFiller) eps = eps.filter((e) => !e.isFiller);
    if (term) {
      const t = term.toLowerCase();
      eps = eps.filter(
        (e) => String(e.number).includes(t) || e.title?.toLowerCase().includes(t)
      );
    }
    return eps;
  }, [episodes, term, hideFiller]);

  if (isLoading) {
    return (
      <div className={cn("gap-2", layout === "grid" ? "grid grid-cols-4 xs:grid-cols-5 sm:grid-cols-8" : "space-y-2")}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className={layout === "grid" ? "h-11 rounded-lg" : "h-20 rounded-lg"} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search episodes…"
            className="pl-9"
          />
        </div>
        <Button
          variant={hideFiller ? "default" : "glass"}
          size="sm"
          onClick={() => setHideFiller((v) => !v)}
        >
          <Filter className="size-4" /> No filler
        </Button>
      </div>

      {layout === "grid" ? (
        <div className="grid grid-cols-4 gap-2 xs:grid-cols-5 sm:grid-cols-8 md:grid-cols-10">
          {filtered.map((ep) => {
            const active = ep.number === currentEpisode;
            const watched = mounted && history && history.episode >= ep.number;
            return (
              <Link
                key={ep.id}
                href={`/watch/${slug}?ep=${ep.number}`}
                title={ep.title ?? `Episode ${ep.number}`}
                className={cn(
                  "relative grid h-11 place-items-center rounded-lg border text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : watched
                      ? "border-border bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/50 hover:bg-accent"
                )}
              >
                {ep.number}
                {ep.isFiller && (
                  <span className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-400" />
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
          {filtered.map((ep) => {
            const active = ep.number === currentEpisode;
            return (
              <li key={ep.id}>
                <Link
                  href={`/watch/${slug}?ep=${ep.number}`}
                  className={cn(
                    "flex gap-3 rounded-lg border p-2 transition-colors",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:border-border hover:bg-accent/50"
                  )}
                >
                  <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                    {ep.thumbnail && (
                      <Image src={ep.thumbnail} alt="" fill sizes="96px" className="object-cover" />
                    )}
                    {active && (
                      <div className="absolute inset-0 grid place-items-center bg-black/40">
                        <Play className="size-5 fill-white text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", active && "text-primary")}>
                      Episode {ep.number}
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{ep.title}</p>
                    {ep.isFiller && <span className="text-[10px] text-amber-400">Filler</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
