export default function Loading() {
  return (
    <div className="min-h-screen px-6 pb-16 pt-6 sm:px-10">
      <div className="mb-6 h-8 w-32 animate-pulse rounded-lg bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl bg-muted/40 p-3">
            <div className="h-16 w-28 shrink-0 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-muted/60" />
              <div className="h-1.5 w-full animate-pulse rounded-full bg-muted/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
