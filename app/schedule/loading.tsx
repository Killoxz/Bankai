export default function Loading() {
  return (
    <div className="min-h-screen px-6 pb-16 pt-6 sm:px-10">
      <div className="mb-8 h-8 w-48 animate-pulse rounded-lg bg-muted" />
      {Array.from({ length: 5 }).map((_, d) => (
        <div key={d} className="mb-8">
          <div className="mb-3 h-5 w-28 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                <div className="h-14 w-10 shrink-0 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/5 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted/60" />
                </div>
                <div className="h-6 w-14 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
