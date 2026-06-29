"use client";

import Link from "next/link";
import { useState } from "react";
import { Play, Heart, Bookmark, Share2, Check, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import {
  useWatchlistStore,
  LIST_STATUS_LABELS,
  type ListStatus,
} from "@/store/watchlist-store";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import type { AnimeCard } from "@/types/anime";

export function AnimeActions({ anime, slug }: { anime: AnimeCard; slug: string }) {
  const mounted = useMounted();
  const isFavorite = useWatchlistStore((s) => s.isFavorite(anime.id));
  const toggleFavorite = useWatchlistStore((s) => s.toggleFavorite);
  const entry = useWatchlistStore((s) => s.getEntry(anime.id));
  const setStatus = useWatchlistStore((s) => s.setStatus);
  const removeEntry = useWatchlistStore((s) => s.removeEntry);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/anime/${slug}`;
    try {
      if (navigator.share) await navigator.share({ title: "Bankai", url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/watch/${slug}?ep=1`} className={buttonVariants({ size: "lg" })}>
        <Play className="fill-current" /> Watch Now
      </Link>

      <Dropdown
        align="start"
        trigger={
          <Button variant="glass" size="lg">
            {mounted && entry ? (
              <>
                <Check className="text-emerald-400" /> {LIST_STATUS_LABELS[entry.status]}
              </>
            ) : (
              <>
                <Plus /> Add to List
              </>
            )}
          </Button>
        }
      >
        <DropdownLabel>Set status</DropdownLabel>
        {(Object.keys(LIST_STATUS_LABELS) as ListStatus[]).map((s) => (
          <DropdownItem key={s} onClick={() => setStatus(anime, s)}>
            {entry?.status === s && <Check className="text-primary" />}
            {LIST_STATUS_LABELS[s]}
          </DropdownItem>
        ))}
        {entry && (
          <>
            <DropdownSeparator />
            <DropdownItem className="text-destructive" onClick={() => removeEntry(anime.id)}>
              Remove from list
            </DropdownItem>
          </>
        )}
      </Dropdown>

      <Button
        variant="glass"
        size="icon"
        aria-label="Favorite"
        onClick={() => toggleFavorite(anime)}
        className={cn(mounted && isFavorite && "text-rose-400")}
      >
        <Heart className={cn(mounted && isFavorite && "fill-current")} />
      </Button>

      <Button
        variant="glass"
        size="icon"
        aria-label="Bookmark"
        onClick={() => setStatus(anime, "PLAN_TO_WATCH")}
      >
        <Bookmark className={cn(mounted && entry?.status === "PLAN_TO_WATCH" && "fill-current text-primary")} />
      </Button>

      <Button variant="glass" size="icon" aria-label="Share" onClick={share}>
        {copied ? <Check className="text-emerald-400" /> : <Share2 />}
      </Button>
    </div>
  );
}
