export default function CategoryLoading() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
      {/* Breadcrumbs skeleton */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-4 w-16 animate-pulse rounded bg-sand" />
        <div className="h-4 w-4 animate-pulse rounded bg-sand" />
        <div className="h-4 w-24 animate-pulse rounded bg-sand" />
      </div>

      <div className="flex gap-8">
        {/* Sidebar skeleton (desktop) */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="flex flex-col gap-4">
            <div className="h-5 w-32 animate-pulse rounded bg-sand" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-sand" style={{ width: `${80 + Math.random() * 80}px` }} />
            ))}
          </div>
        </aside>

        {/* Product grid skeleton */}
        <div className="min-w-0 flex-1">
          <div className="mb-6 h-9 w-48 animate-pulse rounded-lg bg-sand" />
          <div className="mb-4 flex items-center justify-between">
            <div className="h-4 w-24 animate-pulse rounded bg-sand" />
            <div className="h-8 w-32 animate-pulse rounded-pill bg-sand" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
              >
                <div className="aspect-square animate-pulse bg-sand" />
                <div className="flex flex-col gap-2 p-3">
                  <div className="h-3 w-16 animate-pulse rounded bg-sand" />
                  <div className="h-4 w-full animate-pulse rounded bg-sand" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-sand" />
                  <div className="mt-2 h-5 w-20 animate-pulse rounded bg-sand" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
