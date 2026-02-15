import Link from "next/link";
import { Plus } from "lucide-react";
import { BannersList } from "@/components/admin/banners/BannersList";

export default function BannersPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold" style={{ color: "var(--a-text)" }}>Банери</h1>
        <Link
          href="/admin/banners/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
          style={{
            background: "var(--a-accent-btn)",
          }}
        >
          <Plus className="w-4 h-4" />
          Створити банер
        </Link>
      </div>
      <BannersList initialType={searchParams?.type} />
    </div>
  );
}
