export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square rounded-xl bg-neutral-100" />
          <div className="mt-3 h-4 w-3/4 rounded bg-neutral-100" />
          <div className="mt-2 h-4 w-1/3 rounded bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}

export function ListingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="h-4 w-48 animate-pulse rounded bg-neutral-100" />
      <div className="mt-8 flex gap-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        </aside>
        <div className="flex-1">
          <ProductGridSkeleton />
        </div>
      </div>
    </div>
  );
}
