import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { getShowcases } from "@/lib/admin/data";

export default async function ShowcasesPage() {
  const showcases = await getShowcases();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-6 h-6" style={{ color: "var(--a-accent-btn)" }} />
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--a-text)" }}>
              Вітрини товарів
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--a-text-4)" }}>
              {showcases.length} вітрин
            </p>
          </div>
        </div>
        <Link
          href="/admin/homepage/showcases/new"
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--a-accent-btn)" }}
        >
          + Додати вітрину
        </Link>
      </div>

      {/* Cards */}
      {showcases.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
            Ще немає вітрин. Створіть першу!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {showcases.map((s: Record<string, unknown>) => (
            <Link
              key={s.id as string}
              href={`/admin/homepage/showcases/${s.id}`}
              className="block rounded-xl p-5 transition-colors hover:opacity-90"
              style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
            >
              {/* Top row: title + enabled indicator */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-sm font-semibold leading-snug" style={{ color: "var(--a-text)" }}>
                  {s.title_uk as string}
                </h3>
                <span
                  className="shrink-0 w-2.5 h-2.5 rounded-full mt-1"
                  style={{ background: s.is_enabled ? "#4ade80" : "#6b7280" }}
                  title={s.is_enabled ? "Увімкнено" : "Вимкнено"}
                />
              </div>

              {/* Code */}
              <p
                className="text-xs font-mono mb-3"
                style={{ color: "var(--a-text-4)" }}
              >
                {s.code as string}
              </p>

              {/* Meta row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Source type badge */}
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                  style={
                    s.source_type === "rule"
                      ? { background: "#1e3a5f", color: "#60a5fa" }
                      : { background: "#5c3d1a", color: "#fb923c" }
                  }
                >
                  {s.source_type as string}
                </span>

                {/* Product limit */}
                <span className="text-[11px]" style={{ color: "var(--a-text-5)" }}>
                  до {s.product_limit as number} товарів
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
