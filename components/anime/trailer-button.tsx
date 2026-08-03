"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Modal } from "@/components/ui/modal";

function embedUrl(site: string, id: string): string | null {
  if (site === "youtube") return `https://www.youtube.com/embed/${id}?autoplay=1`;
  if (site === "dailymotion") return `https://www.dailymotion.com/embed/video/${id}?autoplay=1`;
  return null;
}

export function TrailerButton({ site, trailerId }: { site: string; trailerId: string }) {
  const [open, setOpen] = useState(false);
  const src = embedUrl(site, trailerId);
  if (!src) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-white bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
      >
        <Play className="size-4 fill-white" />
        Watch Trailer
      </button>

      {/* Always mounted so AnimatePresence catches the exit animation */}
      <Modal open={open} title="Trailer" onClose={() => setOpen(false)} maxWidth={880}>
        <div className="mt-5 aspect-video overflow-hidden rounded-lg bg-black">
          {open && (
            <iframe
              src={src}
              title="Trailer"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="size-full"
            />
          )}
        </div>
      </Modal>
    </>
  );
}
