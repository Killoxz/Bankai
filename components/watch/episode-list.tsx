"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, ChevronDown } from "lucide-react";

interface EpisodeListProps {
  totalEpisodes: number;
  currentEpisode: number;
  onSelectEpisode: (ep: number) => void;
}

const BATCH = 50;

export function EpisodeList({ totalEpisodes, currentEpisode, onSelectEpisode }: EpisodeListProps) {
  const [search, setSearch] = useState("");
  const [batchStart, setBatchStart] = useState(1);
  const [batchOpen, setBatchOpen] = useState(false);
  const activeRef = useRef<HTMLButtonElement>(null);

  const batchEnd = Math.min(batchStart + BATCH - 1, totalEpisodes);
  const totalBatches = Math.ceil(totalEpisodes / BATCH);
  const currentBatch = Math.ceil(currentEpisode / BATCH);

  // Sync batch window to contain the current episode on first render
  useEffect(() => {
    const correctStart = (Math.ceil(currentEpisode / BATCH) - 1) * BATCH + 1;
    setBatchStart(correctStart);
  }, [currentEpisode]);

  // Scroll active episode into view when batch changes
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [batchStart]);

  const episodes = Array.from(
    { length: batchEnd - batchStart + 1 },
    (_, i) => batchStart + i
  ).filter((ep) => {
    const q = search.trim();
    if (!q) return true;
    return String(ep).includes(q);
  });

  if (totalEpisodes <= 1) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Episodes</h3>
        <span className="text-xs text-white/40">
          {currentEpisode} / {totalEpisodes}
        </span>
      </div>

      {/* Search + batch picker */}
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/35" />
          <input
            type="number"
            min={1}
            max={totalEpisodes}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Jump to ep..."
            className="w-full rounded-lg border border-white/12 bg-white/6 py-1.5 pl-8 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
          />
        </div>

        {totalBatches > 1 && (
          <div className="relative">
            <button
              onClick={() => setBatchOpen((o) => !o)}
              className="flex items-center gap-1 rounded-lg border border-white/12 bg-white/6 px-3 py-1.5 text-xs text-white/70 hover:border-white/25"
            >
              {batchStart}–{batchEnd}
              <ChevronDown className="size-3" />
            </button>
            {batchOpen && (
              <div className="absolute right-0 top-10 z-20 max-h-48 w-28 overflow-y-auto rounded-lg border border-white/12 bg-[#1c1c1c] py-1 shadow-2xl">
                {Array.from({ length: totalBatches }, (_, i) => {
                  const s = i * BATCH + 1;
                  const e = Math.min(s + BATCH - 1, totalEpisodes);
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        setBatchStart(s);
                        setBatchOpen(false);
                        setSearch("");
                      }}
                      className={[
                        "block w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/6",
                        Math.ceil(currentEpisode / BATCH) === i + 1
                          ? "text-primary"
                          : "text-white/70",
                      ].join(" ")}
                    >
                      {s}–{e}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Episode grid */}
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
        {episodes.map((ep) => {
          const isActive = ep === currentEpisode;
          return (
            <motion.button
              key={ep}
              ref={isActive ? activeRef : undefined}
              onClick={() => {
                onSelectEpisode(ep);
                setSearch("");
              }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              className={[
                "rounded-lg py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-primary text-black shadow-lg shadow-primary/25"
                  : "bg-white/8 text-white/70 hover:bg-white/14 hover:text-white",
              ].join(" ")}
            >
              {ep}
            </motion.button>
          );
        })}
      </div>

      {episodes.length === 0 && (
        <p className="py-4 text-center text-xs text-white/40">No episode found.</p>
      )}
    </div>
  );
}
