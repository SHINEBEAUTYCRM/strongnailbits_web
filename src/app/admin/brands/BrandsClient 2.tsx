"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Package } from "lucide-react";

interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  country: string | null;
  is_featured: boolean;
  status: string | null;
  product_count: number;
}

export function BrandsClient({ brands }: { brands: BrandItem[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");

  const filtered = useMemo(() => {
    let list = brands;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q) || b.slug?.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      list = list.filter((b) => (b.status || "active") === statusFilter);
    }
    return list;
  }, [brands, query, statusFilter]);

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--a-text-5)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук за назвою..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
          />
        </div>
        <div className="flex gap-1.5 rounded-lg p-1" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
          {(["all", "active", "disabled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                background: statusFilter === s ? "var(--a-accent-bg)" : "transparent",
                color: statusFilter === s ? "var(--a-accent)" : "var(--a-text-4)",
              }}
            >
              {s === "all" ? "Всі" : s === "active" ? "Активні" : "Вимкнені"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
          <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
            {query || statusFilter !== "all" ? "Нічого не знайдено" : "Брендів поки немає"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((b) => (
            <Link
              key={b.id}
              href={`/admin/brands/${b.id}`}
              className="block rounded-xl p-4 transition-all hover:scale-[1.01]"
              style={{
                background: "var(--a-bg-card)",
                border: "1px solid var(--a-border)",
                opacity: (b.status || "active") === "disabled" ? 0.55 : 1,
              }}
            >
              <div className="flex items-center gap-3">
                {b.logo_url ? (
                  <img src={b.logo_url} alt={b.name} className="w-10 h-10 rounded-lg object-contain shrink-0" style={{ background: "var(--a-bg-input)" }} />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--a-bg-input)", color: "var(--a-text-5)" }}>
                    {b.name[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--a-text)" }}>{b.name}</p>
                  <p className="text-[11px]" style={{ color: "var(--a-text-5)" }}>{b.slug}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {b.is_featured && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: "#a78bfa", background: "#2e1065" }}>Featured</span>
                )}
                {b.country && (
                  <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ color: "var(--a-text-4)", background: "var(--a-bg-input)" }}>{b.country}</span>
                )}
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]" style={{ color: "var(--a-text-4)", background: "var(--a-bg-input)" }}>
                  <Package className="w-3 h-3" /> {b.product_count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
