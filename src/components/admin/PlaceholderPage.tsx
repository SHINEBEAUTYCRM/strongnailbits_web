import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PlaceholderPageProps { title: string; icon: LucideIcon; }

export function PlaceholderPage({ title, icon: Icon }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: "#141420" }}>
        <Icon className="w-8 h-8" style={{ color: "#7c3aed" }} />
      </div>
      <h1 className="text-2xl font-semibold mb-2" style={{ color: "#f4f4f5" }}>{title}</h1>
      <p className="text-sm mb-8" style={{ color: "#52525b" }}>Розділ в розробці</p>
      <Link href="/admin" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ background: "#141420", color: "#a1a1aa", border: "1px solid #1e1e2a" }}>
        <ArrowLeft className="w-4 h-4" /> На Dashboard
      </Link>
    </div>
  );
}
