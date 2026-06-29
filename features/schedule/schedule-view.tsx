"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Countdown } from "./countdown";
import { useSchedule } from "@/features/anime/use-anime";
import { preferredTitle } from "@/lib/utils";
import { usePlayerStore } from "@/store/player-store";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ScheduleView() {
  const today = new Date().getDay();
  const [weekday, setWeekday] = useState(today);
  const [category, setCategory] = useState<"all" | "sub" | "dub">("all");
  const { data, isLoading } = useSchedule(weekday);
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={String(weekday)} onValueChange={(v) => setWeekday(Number(v))}>
          <TabsList>
            {DAYS.map((d, i) => (
              <TabsTrigger key={d} value={String(i)}>
                <span className="flex flex-col items-center leading-tight">
                  <span className="text-xs">{d}</span>
                  {i === today && <span className="text-[9px] text-primary">Today</span>}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Select
            aria-label="Audio"
            value={category}
            onChange={(e) => setCategory(e.target.value as "all" | "sub" | "dub")}
            options={[
              { label: "Sub & Dub", value: "all" },
              { label: "Sub", value: "sub" },
              { label: "Dub", value: "dub" },
            ]}
          />
          <span className="hidden text-xs text-muted-foreground sm:inline">{tz}</span>
        </div>
      </div>

      <h2 className="text-lg font-semibold">{FULL_DAYS[weekday]}</h2>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No releases scheduled for {FULL_DAYS[weekday]}.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.map((item, i) => {
            const time = new Date(item.airingAt * 1000).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <li key={`${item.anime.id}-${i}`}>
                <Link
                  href={`/anime/${item.anime.slug}`}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <span className="w-14 shrink-0 text-center text-sm font-medium tabular-nums text-muted-foreground">
                    {time}
                  </span>
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.anime.coverImage && (
                      <Image src={item.anime.coverImage} alt="" fill sizes="48px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium group-hover:text-primary">
                      {preferredTitle(item.anime.title, titleLanguage)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">EP {item.episode}</Badge>
                      {(category === "all" || category === "sub") && <Badge variant="sub">Sub</Badge>}
                      {(category === "all" || category === "dub") && <Badge variant="dub">Dub</Badge>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 text-sm font-medium">
                    <Clock className="size-4 text-muted-foreground" />
                    <Countdown airingAt={item.airingAt} />
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
