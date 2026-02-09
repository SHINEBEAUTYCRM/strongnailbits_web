import Link from "next/link";
import Image from "next/image";

interface BrandCardProps {
  slug: string;
  name: string;
  logoUrl?: string | null;
}

export function BrandCard({ slug, name, logoUrl }: BrandCardProps) {
  return (
    <Link
      href={`/brand/${slug}`}
      className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-purple-500/[0.04]"
    >
      <div className="relative flex h-12 w-full items-center justify-center">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={name}
            width={120}
            height={48}
            className="max-h-12 w-auto object-contain opacity-60 transition-all group-hover:opacity-100"
          />
        ) : (
          <span className="text-base font-semibold text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]">
            {name}
          </span>
        )}
      </div>
    </Link>
  );
}
