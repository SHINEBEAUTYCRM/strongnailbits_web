"use client";

/* ── Skeleton components with CSS shimmer animation ── */

interface SkeletonBoxProps {
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonBox({ className = "", style }: SkeletonBoxProps) {
  return (
    <div
      className={`skeleton-shimmer rounded-lg bg-[#EBEBF0] ${className}`}
      style={style}
    />
  );
}

/* ── Product card skeleton ── */
export function SkeletonCard() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      {/* Image area */}
      <div className="relative aspect-square overflow-hidden bg-[#f5f5f7]">
        <SkeletonBox className="h-full w-full !rounded-none" />
      </div>

      {/* Info area */}
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-3.5">
        {/* Brand */}
        <SkeletonBox className="h-4 w-12 rounded" />
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <SkeletonBox className="h-3.5 w-full rounded" />
          <SkeletonBox className="h-3.5 w-3/5 rounded" />
        </div>
        {/* Stock */}
        <SkeletonBox className="h-3 w-20 rounded" />
        {/* Price + cart */}
        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="flex flex-col gap-1">
            <SkeletonBox className="h-3 w-14 rounded" />
            <SkeletonBox className="h-5 w-20 rounded" />
          </div>
          <SkeletonBox className="h-9 w-9 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ── Product grid skeleton ── */
interface SkeletonGridProps {
  count?: number;
}

export function SkeletonGrid({ count = 8 }: SkeletonGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/* ── Horizontal section skeleton ── */
export function SkeletonSection() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SkeletonBox className="h-7 w-40 rounded-lg" />
        <SkeletonBox className="h-5 w-20 rounded" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-[210px] shrink-0">
            <SkeletonCard />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Banner skeleton ── */
export function SkeletonBanner() {
  return (
    <div>
      <SkeletonBox className="aspect-[2.5/1] w-full rounded-2xl" />
      <div className="mt-3 flex justify-center gap-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBox
            key={i}
            className={`h-2 rounded-full ${i === 0 ? "w-6" : "w-2"}`}
          />
        ))}
      </div>
    </div>
  );
}
