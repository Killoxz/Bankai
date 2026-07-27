"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Modal } from "@/components/ui/modal";

export function TrailerButton({ youtubeId }: { youtubeId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-white bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
      >
        <Play className="size-4 fill-white" />
        Watch Trailer
      </button>

      {open && (
        <Modal title="Trailer" onClose={() => setOpen(false)} maxWidth={800}>
          <div className="mt-5 aspect-video overflow-hidden rounded-lg bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
              title="Trailer"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="size-full"
            />
          </div>
        </Modal>
      )}
    </>
  );
}
