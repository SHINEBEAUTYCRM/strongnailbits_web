export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:py-8">
      {/* Breadcrumbs */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-4 w-16 animate-pulse rounded bg-sand" />
        <div className="h-4 w-4 animate-pulse rounded bg-sand" />
        <div className="h-4 w-32 animate-pulse rounded bg-sand" />
      </div>

      <div className="flex flex-col gap-6 lg:mt-4 lg:flex-row lg:gap-8">
        {/* Gallery */}
        <div className="w-full lg:w-[42%]">
          <div className="aspect-square animate-pulse rounded-2xl bg-sand" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 w-16 animate-pulse rounded-lg bg-sand" />
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="hidden w-full lg:block lg:w-[30%]">
          <div className="h-4 w-20 animate-pulse rounded bg-sand" />
          <div className="mt-3 h-7 w-3/4 animate-pulse rounded bg-sand" />
          <div className="mt-2 h-7 w-1/2 animate-pulse rounded bg-sand" />
          <div className="mt-6 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-sand" style={{ width: `${60 + Math.random() * 40}%` }} />
            ))}
          </div>
        </div>

        {/* Buy sidebar */}
        <div className="w-full lg:w-[28%]">
          <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
            <div className="h-8 w-32 animate-pulse rounded bg-sand" />
            <div className="mt-2 h-5 w-20 animate-pulse rounded bg-sand" />
            <div className="mt-4 h-3 w-24 animate-pulse rounded bg-sand" />
            <div className="mt-6 h-12 w-full animate-pulse rounded-pill bg-sand" />
          </div>
        </div>
      </div>
    </div>
  );
}
