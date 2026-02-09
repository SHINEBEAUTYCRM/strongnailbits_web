import Link from "next/link";
import { Package } from "lucide-react";
import { getProducts } from "@/lib/admin/data";

function formatPrice(v: number) {
  return v.toLocaleString("uk-UA");
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const { products, total } = await getProducts({
    page,
    status: params.status,
    search: params.search,
  });
  const totalPages = Math.ceil(total / 25);

  const statuses = [
    { key: "all", label: "Всі" },
    { key: "active", label: "Активні" },
    { key: "disabled", label: "Вимкнені" },
    { key: "hidden", label: "Приховані" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-3">
            <Package className="w-6 h-6 text-purple-400" />
            Товари
          </h1>
          <p className="text-sm text-white/40">{total} товарів</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {statuses.map((s) => {
          const active = (params.status || "all") === s.key;
          return (
            <Link
              key={s.key}
              href={`/admin/products?status=${s.key}${params.search ? `&search=${params.search}` : ""}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                active
                  ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30"
                  : "text-white/40 hover:text-white/60 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Товар</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">SKU</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Категорія</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Бренд</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Ціна</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Залишок</th>
                <th className="text-center px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Статус</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const cat = p.categories as { name_uk?: string } | null;
                const brand = p.brands as { name?: string } | null;
                const stockColor = p.quantity === 0 ? "text-red-400" : p.quantity < 5 ? "text-amber-400" : "text-green-400";
                const statusColor = p.status === "active" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/30";
                return (
                  <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.main_image_url ? (
                          <img src={p.main_image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-white/5" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white/[0.04] shrink-0" />
                        )}
                        <span className="text-white/80 truncate max-w-[250px]">{p.name_uk}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/40 font-mono text-xs">{p.sku || "—"}</td>
                    <td className="px-4 py-3 text-white/40 text-xs">{cat?.name_uk || "—"}</td>
                    <td className="px-4 py-3 text-white/40 text-xs">{brand?.name || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-white/70">
                      {formatPrice(Number(p.price))} ₴
                      {p.old_price && (
                        <span className="block text-[10px] text-white/20 line-through">{formatPrice(Number(p.old_price))} ₴</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono tabular-nums text-xs ${stockColor}`}>
                      {p.quantity}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor}`}>
                        {p.status === "active" ? "Актив" : p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-white/20">Товарів не знайдено</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-white/30">Сторінка {page} з {totalPages}</p>
            <div className="flex gap-1">
              {page > 1 && (
                <Link href={`/admin/products?page=${page - 1}&status=${params.status || "all"}`} className="px-3 py-1 rounded-lg text-xs text-white/50 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] transition-colors">←</Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/products?page=${page + 1}&status=${params.status || "all"}`} className="px-3 py-1 rounded-lg text-xs text-white/50 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] transition-colors">→</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
