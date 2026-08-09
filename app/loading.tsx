export default function Loading() {
  return (
    <div className="min-h-screen bg-background lg:-mt-16 overflow-hidden">
      {/* Hero skeleton */}
      <div
        className="relative w-full animate-pulse bg-muted/50"
        style={{ height: "min(72vh, 720px)", minHeight: 520 }}
      >
        {/* Gradient overlays matching the real hero */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />

        {/* Content placeholder */}
        <div className="absolute bottom-20 left-8 sm:left-12 max-w-xl space-y-4 pr-4">
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-full bg-muted" />
            <div className="h-5 w-20 rounded-full bg-muted" />
          </div>
          <div className="h-10 w-72 rounded-xl bg-muted sm:w-80" />
          <div className="h-10 w-56 rounded-xl bg-muted sm:w-64" />
          <div className="h-4 w-full max-w-xs rounded bg-muted/60" />
          <div className="h-3 w-4/5 max-w-xs rounded bg-muted/40" />
          <div className="flex gap-3 pt-1">
            <div className="h-10 w-32 rounded-full bg-muted" />
            <div className="h-10 w-28 rounded-full bg-muted/60" />
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="relative z-10 -mt-4 space-y-10 px-6 pb-16 sm:px-10">
        <RowSkeleton title width="w-36" count={9} />
        <RowSkeleton title width="w-28" count={9} />
      </div>
    </div>
  );
}

function RowSkeleton({ title, width, count }: { title: boolean; width: string; count: number }) {
  return (
    <div>
      {title && <div className={`mb-4 h-5 ${width} animate-pulse rounded-lg bg-muted`} />}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="w-[148px] shrink-0 space-y-1.5">
            <div className="aspect-[2/3] w-full animate-pulse rounded-xl bg-muted" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
