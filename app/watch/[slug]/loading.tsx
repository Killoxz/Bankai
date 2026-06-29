import { Skeleton } from "@/components/ui/skeleton";

export default function WatchLoading() {
  return (
    <div className="flex h-[calc(100dvh-0px)] flex-col lg:flex-row">
      {/* Video + info column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Video player skeleton */}
        <Skeleton className="w-full rounded-none" style={{ aspectRatio: "16/9" }} />

        {/* Episode title + controls skeleton */}
        <div className="space-y-3 p-4">
          <Skeleton className="h-5 w-48 rounded" />
          <Skeleton className="h-4 w-80 rounded" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Episode list sidebar skeleton */}
      <div className="hidden w-80 shrink-0 border-l border-border lg:flex lg:flex-col">
        <div className="border-b border-border p-3">
          <Skeleton className="h-5 w-32 rounded" />
        </div>
        <div className="flex-1 space-y-1 overflow-hidden p-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
