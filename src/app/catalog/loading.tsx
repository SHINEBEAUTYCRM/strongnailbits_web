export default function CatalogLoading() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
      {/* Title skeleton */}
      <div className="mb-6 h-9 w-64 animate-pulse rounded-lg bg-sand" />

      {/* Category list skeleton */}
      <div className="overflow-hidden rounded-card border border-[var(--border)] bg-white">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"
          >
            <div className="h-5 animate-pulse rounded bg-sand" style={{ width: `${120 + Math.random() * 100}px` }} />
            <div className="h-4 w-4 animate-pulse rounded bg-sand" />
          </div>
        ))}
      </div>
    </div>
  );
}
