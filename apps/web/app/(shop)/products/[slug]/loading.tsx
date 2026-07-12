export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="h-4 w-64 animate-pulse rounded bg-neutral-100" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[55%_1fr]">
        <div>
          <div className="aspect-square animate-pulse rounded-2xl bg-neutral-100" />
          <div className="mt-3 flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 w-20 animate-pulse rounded-lg bg-neutral-100"
              />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-8 w-3/4 animate-pulse rounded bg-neutral-100" />
          <div className="h-7 w-40 animate-pulse rounded bg-neutral-100" />
          <div className="h-24 animate-pulse rounded bg-neutral-100" />
          <div className="h-12 animate-pulse rounded-full bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}
