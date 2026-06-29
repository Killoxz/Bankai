"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function TrailerButton({ youtubeId }: { youtubeId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="lg" onClick={() => setOpen(true)}>
        <PlayCircle /> Trailer
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} className="max-w-3xl">
        <div className="aspect-video w-full">
          {open && (
            <iframe
              className="size-full"
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
              title="Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </Dialog>
    </>
  );
}
