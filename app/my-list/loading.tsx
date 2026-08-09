export default function Loading() {
  return (
    <div className="min-h-screen px-6 pb-16 pt-6 sm:px-10">
      <div className="mb-6 h-8 w-32 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        {Array.from({ length: 21 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="aspect-[2/3] animate-pulse rounded-xl bg-muted" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
