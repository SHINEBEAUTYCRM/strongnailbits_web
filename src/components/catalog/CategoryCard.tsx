import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

interface CategoryCardProps {
  slug: string;
  name: string;
  imageUrl?: string | null;
  productCount?: number;
}

export function CategoryCard({
  slug,
  name,
  imageUrl,
  productCount,
}: CategoryCardProps) {
  return (
    <Link
      href={`/catalog/${slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[var(--accent-purple)]/10 to-[var(--accent-pink)]/10">
            <span className="text-3xl font-light text-white/10">
              {name.charAt(0)}
            </span>
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-transparent to-transparent" />
      </div>

      <div className="flex items-center justify-between p-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] transition-colors group-hover:text-white">
            {name}
          </h3>
          {productCount != null && productCount > 0 && (
            <span className="text-xs text-[var(--text-muted)]">
              {productCount} товарів
            </span>
          )}
        </div>
        <ChevronRight
          size={16}
          className="text-[var(--text-muted)] transition-all group-hover:translate-x-1 group-hover:text-[var(--accent-purple)]"
        />
      </div>
    </Link>
  );
}
