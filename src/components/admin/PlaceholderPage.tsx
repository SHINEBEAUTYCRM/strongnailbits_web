import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  icon: LucideIcon;
}

export function PlaceholderPage({ title, icon: Icon }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-white/40" />
      </div>
      <h1 className="text-2xl font-semibold text-white mb-2">{title}</h1>
      <p className="text-[#888] mb-8">Розділ в розробці</p>
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all duration-150"
      >
        <ArrowLeft className="w-4 h-4" />
        На Dashboard
      </Link>
    </div>
  );
}
