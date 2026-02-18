export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="h-8 w-72 animate-pulse rounded-lg bg-sand" />
        <div className="mt-2 h-4 w-32 animate-pulse rounded bg-sand" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
          >
            <div className="aspect-square animate-pulse bg-sand" />
            <div className="flex flex-col gap-2 p-3">
              <div className="h-3 w-16 animate-pulse rounded bg-sand" />
              <div className="h-4 w-full animate-pulse rounded bg-sand" />
              <div className="mt-2 h-5 w-20 animate-pulse rounded bg-sand" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
