import { AlertTriangle } from "lucide-react";

export function DownPlayer({ poster }: { poster?: string }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="absolute inset-0 size-full object-cover opacity-15" />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 px-4 text-center">
        <AlertTriangle className="size-8 text-primary" />
        <p className="text-sm font-medium text-white">Streaming services are down</p>
        <p className="text-xs text-white/50">Please check back later.</p>
      </div>
    </div>
  );
}
