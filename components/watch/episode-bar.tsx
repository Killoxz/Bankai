"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronDown, Download } from "lucide-react";

export function EpisodeBar({
  animeId,
  totalEpisodes,
  currentEp,
}: {
  animeId: number;
  totalEpisodes: number;
  currentEp: number;
}) {
  const router = useRouter();
  const [epOpen, setEpOpen] = useState(false);
  const [serverOpen, setServerOpen] = useState(false);

  const goTo = (ep: number) => {
    if (ep < 1 || ep > totalEpisodes) return;
    router.push(`/watch/${animeId}?ep=${ep}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white/5 p-4">
      <div>
        <p className="mb-1.5 text-xs text-white/50">Episodes</p>
        <div
          className="relative"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setEpOpen(false);
          }}
        >
          <button
            onClick={() => setEpOpen((o) => !o)}
            className="flex w-40 items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
          >
            Episode {String(currentEp).padStart(3, "0")}
            <ChevronDown className="size-4 text-white/50" />
          </button>
          {epOpen && (
            <div className="absolute left-0 top-11 z-20 max-h-64 w-40 overflow-y-auto rounded-lg border border-white/10 bg-[#1c1c1c] py-1 shadow-2xl">
              {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => (
                <button
                  key={ep}
                  onClick={() => {
                    goTo(ep);
                    setEpOpen(false);
                  }}
                  className={[
                    "block w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-white/5",
                    ep === currentEp ? "text-primary" : "text-white/80",
                  ].join(" ")}
                >
                  Episode {String(ep).padStart(3, "0")}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end gap-1.5 pb-0.5">
        <button
          onClick={() => goTo(currentEp - 1)}
          disabled={currentEp <= 1}
          aria-label="Previous episode"
          className="grid size-9 place-items-center rounded-lg bg-white/5 text-white/70 transition-colors hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={() => goTo(currentEp + 1)}
          disabled={currentEp >= totalEpisodes}
          aria-label="Next episode"
          className="grid size-9 place-items-center rounded-lg bg-white/5 text-white/70 transition-colors hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div>
        <p className="mb-1.5 text-xs text-white/50">Servers</p>
        <div
          className="relative"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setServerOpen(false);
          }}
        >
          <button
            onClick={() => setServerOpen((o) => !o)}
            className="flex w-32 items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
          >
            Official
            <ChevronDown className="size-4 text-white/50" />
          </button>
          {serverOpen && (
            <div className="absolute left-0 top-11 z-20 w-32 rounded-lg border border-white/10 bg-[#1c1c1c] px-3 py-2.5 text-xs text-white/50 shadow-2xl">
              No other servers available yet.
            </div>
          )}
        </div>
      </div>

      <div className="ml-auto self-end">
        <button
          disabled
          title="No stream source available to download yet"
          className="flex items-center gap-2 rounded-lg bg-primary/40 px-4 py-2 text-sm font-semibold text-black/50"
        >
          <Download className="size-4" />
          Download
        </button>
      </div>
    </div>
  );
}
