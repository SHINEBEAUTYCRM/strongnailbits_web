import type { ReactNode } from "react";

interface ProductGridProps {
  children: ReactNode;
  /** Number of columns on large screens (default 4) */
  cols?: 4 | 5;
}

export function ProductGrid({ children, cols = 4 }: ProductGridProps) {
  const colClass =
    cols === 5
      ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5"
      : "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4";

  return <div className={colClass}>{children}</div>;
}
