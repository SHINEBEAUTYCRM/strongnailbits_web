import Link from "next/link";
import { Package, Plus, Pencil } from "lucide-react";
import { getProducts } from "@/lib/admin/data";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { ExportButton } from "@/components/admin/ExportButton";

function fmt(v: number) { return v.toLocaleString("uk-UA"); }

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; search?: string }> }) {
  const p = await searchParams;
  const page = Number(p.page) || 1;
  const { products, total } = await getProducts({ page, status: p.status, search: p.search });
  const tp = Math.ceil(total / 25);
  const statuses = [{ k: "all", l: "Всі" }, { k: "active", l: "Активні" }, { k: "disabled", l: "Вимкнені" }, { k: "hidden", l: "Приховані" }];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-semibold mb-1 flex items-center gap-3" style={{ color: "#f4f4f5" }}><Package className="w-6 h-6" style={{ color: "#a855f7" }} />Товари</h1><p className="text-sm" style={{ color: "#52525b" }}>{total} товарів</p></div>
        <div className="flex items-center gap-3">
          <AdminSearch placeholder="Пошук за назвою, SKU..." />
          <ExportButton entity="products" />
          <Link href="/admin/products/new" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shrink-0" style={{ background: "#7c3aed" }}><Plus className="w-4 h-4" /> Додати</Link>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">{statuses.map((s) => { const a = (p.status || "all") === s.k; return (
        <Link key={s.k} href={`/admin/products?status=${s.k}${p.search ? `&search=${p.search}` : ""}`} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={a ? { background: "#1e1030", color: "#c084fc", border: "1px solid #581c87" } : { background: "#111116", color: "#71717a", border: "1px solid #1e1e2a" }}>{s.l}</Link>
      ); })}</div>
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ borderBottom: "1px solid #1e1e2a" }}>
          <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Товар</th>
          <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>SKU</th>
          <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Категорія</th>
          <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Бренд</th>
          <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Ціна</th>
          <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Залишок</th>
          <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Статус</th>
        </tr></thead><tbody>{products.map((pr) => {
          const cat = pr.categories as { name_uk?: string } | null;
          const brand = pr.brands as { name?: string } | null;
          const sc = pr.quantity === 0 ? "#f87171" : pr.quantity < 5 ? "#fbbf24" : "#4ade80";
          const stC = pr.status === "active" ? { c: "#4ade80", bg: "#052e16" } : { c: "#71717a", bg: "#18181b" };
          return (<tr key={pr.id} style={{ borderBottom: "1px solid #141420" }}>
            <td className="px-4 py-3"><Link href={`/admin/products/${pr.id}`} className="flex items-center gap-3 group">
              {pr.main_image_url ? <img src={pr.main_image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" style={{ background: "#1a1a24" }} /> : <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: "#141420" }} />}
              <span className="truncate max-w-[250px] group-hover:underline" style={{ color: "#a1a1aa" }}>{pr.name_uk}</span>
              <Pencil className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#52525b" }} />
            </Link></td>
            <td className="px-4 py-3 font-mono text-xs" style={{ color: "#52525b" }}>{pr.sku || "—"}</td>
            <td className="px-4 py-3 text-xs" style={{ color: "#52525b" }}>{cat?.name_uk || "—"}</td>
            <td className="px-4 py-3 text-xs" style={{ color: "#52525b" }}>{brand?.name || "—"}</td>
            <td className="px-4 py-3 text-right font-mono tabular-nums" style={{ color: "#a1a1aa" }}>{fmt(Number(pr.price))} ₴{pr.old_price && <span className="block text-[10px] line-through" style={{ color: "#3f3f46" }}>{fmt(Number(pr.old_price))} ₴</span>}</td>
            <td className="px-4 py-3 text-right font-mono tabular-nums text-xs" style={{ color: sc }}>{pr.quantity}</td>
            <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: stC.c, background: stC.bg }}>{pr.status === "active" ? "Актив" : pr.status}</span></td>
          </tr>);
        })}{products.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center" style={{ color: "#3f3f46" }}>Товарів не знайдено</td></tr>}</tbody></table></div>
        {tp > 1 && <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid #1e1e2a" }}>
          <p className="text-xs" style={{ color: "#3f3f46" }}>Сторінка {page} з {tp}</p>
          <div className="flex gap-1">
            {page > 1 && <Link href={`/admin/products?page=${page - 1}&status=${p.status || "all"}`} className="px-3 py-1 rounded-lg text-xs" style={{ color: "#71717a", background: "#111116" }}>←</Link>}
            {page < tp && <Link href={`/admin/products?page=${page + 1}&status=${p.status || "all"}`} className="px-3 py-1 rounded-lg text-xs" style={{ color: "#71717a", background: "#111116" }}>→</Link>}
          </div>
        </div>}
      </div>
    </div>
  );
}
