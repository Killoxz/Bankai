"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import { Play, Star, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AiringEntry } from "@/lib/anilist";
import { usePreferredTitle } from "@/lib/anilist";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(unixTs: number): string {
  const d = new Date(unixTs * 1000);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDate(unixTs: number): string {
  const d = new Date(unixTs * 1000);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ScheduleCard({ entry }: { entry: AiringEntry }) {
  const title = usePreferredTitle(entry.media);
  const score = entry.media.averageScore;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="group flex items-center gap-4 rounded-xl border border-white/8 bg-white/4 p-3 transition-colors hover:bg-white/8"
    >
      {/* Cover */}
      <Link href={`/anime/${entry.media.id}`} className="shrink-0">
        <div className="relative h-20 w-14 overflow-hidden rounded-lg bg-white/10">
          {entry.media.coverImage.large && (
            <Image
              src={entry.media.coverImage.large}
              alt={title}
              fill
              sizes="56px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <Link href={`/anime/${entry.media.id}`}>
          <p className="line-clamp-1 text-sm font-semibold text-white transition-colors hover:text-primary">
            {title}
          </p>
        </Link>
        <p className="mt-0.5 text-xs text-white/50">
          Episode {entry.episode}
          {entry.media.episodes && ` / ${entry.media.episodes}`}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {score && (
            <span className="flex items-center gap-1 text-[11px] text-white/60">
              <Star className="size-3 fill-primary text-primary" />
              {(score / 10).toFixed(1)}
            </span>
          )}
          {entry.media.genres.slice(0, 2).map((g) => (
            <span
              key={g}
              className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium text-white/55"
            >
              {g}
            </span>
          ))}
        </div>
      </div>

      {/* Airing time + watch button */}
      <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
        <span className="text-xs font-medium text-primary">{formatTime(entry.airingAt)}</span>
        <Link
          href={`/watch/${entry.media.id}?ep=${entry.episode}`}
          className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary hover:text-black"
        >
          <Play className="size-3 fill-current" />
          Watch
        </Link>
      </div>
    </motion.div>
  );
}

export function ScheduleView({ entries }: { entries: AiringEntry[] }) {
  const today = new Date().getDay();
  const [activeDay, setActiveDay] = useState<number>(today);

  // Build a map: dayOfWeek -> sorted entries
  const byDay = useMemo(() => {
    const map: Record<number, AiringEntry[]> = {};
    for (let d = 0; d < 7; d++) map[d] = [];
    for (const e of entries) {
      const day = new Date(e.airingAt * 1000).getDay();
      map[day].push(e);
    }
    return map;
  }, [entries]);

  const visibleEntries = byDay[activeDay] ?? [];

  // Days that have entries
  const activeDays = new Set(
    entries.map((e) => new Date(e.airingAt * 1000).getDay())
  );

  // Find date string for each day tab
  function dayDate(dayIndex: number): string {
    const entries = byDay[dayIndex];
    if (entries && entries.length > 0) {
      return formatDate(entries[0].airingAt);
    }
    return "";
  }

  return (
    <div>
      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
        {DAY_LABELS.map((label, idx) => {
          const isToday = idx === today;
          const isActive = idx === activeDay;
          const hasEntries = activeDays.has(idx);
          return (
            <button
              key={idx}
              onClick={() => setActiveDay(idx)}
              className={[
                "relative flex flex-col items-center gap-0.5 rounded-xl px-4 py-2.5 text-center transition-all min-w-[72px]",
                isActive
                  ? "bg-primary text-black"
                  : "bg-white/6 text-white/60 hover:bg-white/10 hover:text-white",
                !hasEntries && !isActive && "opacity-40",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
              {isToday && (
                <span
                  className={[
                    "text-[10px] font-semibold",
                    isActive ? "text-black/70" : "text-primary",
                  ].join(" ")}
                >
                  Today
                </span>
              )}
              {!isToday && (
                <span
                  className={[
                    "text-[10px]",
                    isActive ? "text-black/60" : "text-white/35",
                  ].join(" ")}
                >
                  {dayDate(idx) || DAY_FULL[idx].slice(0, 3)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Entry list */}
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />
          <h2 className="text-sm font-bold text-white">
            {DAY_FULL[activeDay]}
            {activeDay === today && (
              <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Today
              </span>
            )}
          </h2>
          <span className="ml-auto text-xs text-white/40">{visibleEntries.length} episodes</span>
        </div>

        <AnimatePresence mode="wait">
          {visibleEntries.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-white/8 py-16 text-center"
            >
              <p className="text-sm text-white/40">No anime scheduled for {DAY_FULL[activeDay]}.</p>
            </motion.div>
          ) : (
            <motion.div
              key={activeDay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {visibleEntries.map((entry) => (
                <ScheduleCard key={`${entry.media.id}-${entry.episode}`} entry={entry} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
