"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

export function AddToCollectionButton() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/15"
      >
        <Plus className="size-4" />
        Add to Collection
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-10 w-56 rounded-lg border border-white/10 bg-[#1c1c1c] px-3.5 py-3 text-xs text-white/50 shadow-xl">
          Collections aren&apos;t available yet.
        </div>
      )}
    </div>
  );
}
