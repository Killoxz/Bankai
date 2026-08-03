export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar stub */}
      <div className="h-[104px] border-b border-white/5 bg-background/80" />

      <div className="mx-auto max-w-[1400px] px-6 pb-16 pt-6 sm:px-10">
        {/* Title */}
        <div className="mb-6 space-y-2">
          <div className="h-7 w-72 animate-pulse rounded-lg bg-white/10" />
          <div className="h-4 w-48 animate-pulse rounded bg-white/5" />
        </div>

        {/* Player */}
        <div className="aspect-video w-full animate-pulse rounded-xl bg-white/5" />

        {/* Server / provider row */}
        <div className="mt-4 flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>

        {/* Episode grid */}
        <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
