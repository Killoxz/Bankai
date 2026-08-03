export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar stub */}
      <div className="h-[104px] border-b border-white/5 bg-background/80" />

      {/* Banner */}
      <div className="h-[34vh] min-h-[240px] w-full animate-pulse bg-white/5" />

      <div className="relative mx-auto w-full max-w-[1400px] px-6 pb-16 sm:px-10">
        <div className="-mt-24 flex flex-col gap-6 sm:flex-row sm:items-end">
          {/* Poster */}
          <div className="aspect-[2/3] w-36 shrink-0 animate-pulse rounded-xl bg-white/10 sm:w-48" />

          {/* Title area */}
          <div className="flex-1 space-y-3 pb-1">
            <div className="h-9 w-2/3 animate-pulse rounded-lg bg-white/10" />
            <div className="h-4 w-1/4 animate-pulse rounded bg-white/5" />
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex gap-3">
          <div className="h-10 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="h-10 w-24 animate-pulse rounded-full bg-white/5" />
          <div className="h-10 w-24 animate-pulse rounded-full bg-white/5" />
        </div>

        {/* Tabs */}
        <div className="mt-10 space-y-5">
          <div className="flex gap-6 border-b border-white/10 pb-3">
            {[80, 96, 64, 80].map((w, i) => (
              <div key={i} className="animate-pulse rounded bg-white/10" style={{ height: 20, width: w }} />
            ))}
          </div>
          <div className="space-y-2.5">
            {[100, 95, 88, 92, 70].map((w, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-white/5" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
