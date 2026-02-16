import Link from "next/link";
import { Package, Plus, Pencil, ImageOff, FileX, Search, Tag, DollarSign, AlertTriangle } from "lucide-react";
import { getProducts, getProductQualityCounts } from "@/lib/admin/data";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { ExportButton } from "@/components/admin/ExportButton";
// import { ProductBulkBar } from "@/components/admin/ProductBulkBar";

function fmt(v: number) { return v.toLocaleString("uk-UA"); }

const QUALITY_FILTERS = [
  { k: "no_photo", l: "Без фото", icon: ImageOff, color: "#f97316", bg: "#431407" },
  { k: "no_description", l: "Без опису", icon: FileX, color: "#f59e0b", bg: "#451a03" },
  { k: "no_seo", l: "SEO проблеми", icon: Search, color: "#ef4444", bg: "#450a0a" },
  { k: "no_category", l: "Без категорії", icon: Tag, color: "#8b5cf6", bg: "#2e1065" },
  { k: "no_price", l: "Без ціни", icon: DollarSign, color: "#ec4899", bg: "#500724" },
];

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; search?: string; filter?: string }> }) {
  const p = await searchParams;
  const page = Number(p.page) || 1;
  const limit = 25;
  const [{ products, total }, qualityCounts] = await Promise.all([
    getProducts({ page, limit, status: p.status, search: p.search, filter: p.filter }),
    getProductQualityCounts(),
  ]);
  const tp = Math.ceil(total / limit);
  const statuses = [{ k: "all", l: "Всі" }, { k: "active", l: "Активні" }, { k: "disabled", l: "Вимкнені" }, { k: "hidden", l: "Приховані" }];

  const buildUrl = (overrides: { page?: number; status?: string; filter?: string }) => {
    const s = overrides.status ?? p.status ?? "all";
    const f = overrides.filter ?? p.filter ?? "";
    const pg = overrides.page ?? 1;
    let url = `/admin/products?page=${pg}&status=${s}`;
    if (f) url += `&filter=${f}`;
    if (p.search) url += `&search=${p.search}`;
    return url;
  };

  const qp = (pg: number) => buildUrl({ page: pg });

  const pages: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(tp, page + 2); i++) pages.push(i);

  const totalIssues = qualityCounts.no_photo + qualityCounts.no_description + qualityCounts.no_seo + qualityCounts.no_category + qualityCounts.no_price;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1 flex items-center gap-3" style={{ color: "var(--a-text)" }}>
            <Package className="w-6 h-6" style={{ color: "var(--a-accent)" }} />Товари
          </h1>
          <p className="text-sm" style={{ color: "var(--a-text-4)" }}>{total} товарів</p>
        </div>
        <div className="flex items-center gap-3">
          <AdminSearch placeholder="Пошук за назвою, SKU..." />
          <ExportButton entity="products" />
          <Link href="/admin/products/new" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shrink-0" style={{ background: "var(--a-accent-btn)" }}>
            <Plus className="w-4 h-4" /> Додати
          </Link>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {statuses.map((s) => {
          const a = (p.status || "all") === s.k;
          return (
            <Link key={s.k} href={buildUrl({ status: s.k, filter: p.filter })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={a ? { background: "var(--a-accent-bg)", color: "var(--a-accent)", border: "1px solid var(--a-accent)" } : { background: "var(--a-bg-input)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}>
              {s.l}
            </Link>
          );
        })}
      </div>

      {/* Quality / SEO filters */}
      {totalIssues > 0 && (
        <div className="rounded-xl p-4 mb-6" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "var(--a-card-shadow)" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: "#f59e0b" }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>
              Потребують уваги
            </h3>
            {p.filter && (
              <Link href={buildUrl({ filter: "" })} className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ color: "var(--a-text-3)", background: "var(--a-border)" }}>
                Скинути фільтр ✕
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {QUALITY_FILTERS.map((f) => {
              const count = qualityCounts[f.k as keyof typeof qualityCounts];
              if (count === 0) return null;
              const isActive = p.filter === f.k;
              const Icon = f.icon;
              return (
                <Link key={f.k} href={buildUrl({ filter: isActive ? "" : f.k })}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={isActive
                    ? { color: f.color, background: f.bg, border: `1px solid ${f.color}40` }
                    : { color: "var(--a-text-3)", background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
                  <Icon className="w-3.5 h-3.5" />
                  {f.l}
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={isActive ? { color: f.color, background: `${f.color}20` } : { color: "var(--a-text-4)", background: "var(--a-bg-muted)" }}>
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bulk actions — temporarily disabled */}
      {/* <ProductBulkBar productIds={products.map((pr) => pr.id)} /> */}

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "var(--a-card-shadow)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Товар</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--a-text-5)" }}>SKU</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider hidden lg:table-cell" style={{ color: "var(--a-text-5)" }}>Категорія</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Ціна</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Залишок</th>
                <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Якість</th>
                <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Статус</th>
                <th className="w-10 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((pr) => {
                const cat = pr.categories as { name_uk?: string } | null;
                const brand = pr.brands as { name?: string } | null;
                const sc = pr.quantity === 0 ? "#f87171" : pr.quantity < 5 ? "#fbbf24" : "#4ade80";
                const stC = pr.status === "active" ? { c: "#4ade80", bg: "#052e16" } : { c: "var(--a-text-3)", bg: "var(--a-bg-input)" };

                const issues: { label: string; tip: string; color: string }[] = [];
                if (!pr.main_image_url) issues.push({ label: "Ф", tip: "Немає фото", color: "#f97316" });
                if (!pr.description_uk) issues.push({ label: "О", tip: "Немає опису", color: "#f59e0b" });
                if (!pr.meta_title || !pr.meta_description) issues.push({ label: "S", tip: "SEO не заповнено", color: "#ef4444" });

                return (
                  <tr key={pr.id} className="admin-row transition-colors" style={{ borderBottom: "1px solid var(--a-border-sub)" }}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${pr.id}`} className="flex items-center gap-3">
                        {pr.main_image_url
                          ? <img src={pr.main_image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" style={{ background: "var(--a-bg-muted)" }} />
                          : <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "#1c0f06", border: "1px solid #431407" }}><ImageOff className="w-4 h-4" style={{ color: "#f97316" }} /></div>
                        }
                        <div className="min-w-0">
                          <p className="text-sm truncate max-w-[250px]" style={{ color: "var(--a-text-body)" }}>{pr.name_uk}</p>
                          {brand?.name && <p className="text-[11px] mt-0.5" style={{ color: "var(--a-text-5)" }}>{brand.name}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs hidden md:table-cell" style={{ color: "var(--a-text-4)" }}>{pr.sku || "—"}</td>
                    <td className="px-4 py-3 text-xs hidden lg:table-cell" style={{ color: "var(--a-text-4)" }}>{cat?.name_uk || <span style={{ color: "var(--a-accent)" }}>—</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono tabular-nums text-sm" style={{ color: "var(--a-text-2)" }}>{fmt(Number(pr.price))} ₴</span>
                      {pr.old_price && <span className="block text-[10px] line-through font-mono" style={{ color: "var(--a-text-5)" }}>{fmt(Number(pr.old_price))} ₴</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-xs" style={{ color: sc }}>{pr.quantity}</td>
                    <td className="px-4 py-3">
                      {issues.length > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          {issues.map((iss) => (
                            <span key={iss.label} title={iss.tip}
                              className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold cursor-help"
                              style={{ color: iss.color, background: `${iss.color}18`, border: `1px solid ${iss.color}30` }}>
                              {iss.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <span className="w-5 h-5 rounded-md flex items-center justify-center text-[9px]" style={{ color: "#4ade80", background: "#052e1680" }}>✓</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: stC.c, background: stC.bg }}>
                        {pr.status === "active" ? "Актив" : pr.status}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <Link href={`/admin/products/${pr.id}`} className="p-1.5 rounded-lg inline-flex" style={{ color: "var(--a-text-4)" }} title="Редагувати">
                        <Pencil className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center" style={{ color: "var(--a-text-5)" }}>Товарів не знайдено</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 px-4 py-2.5" style={{ borderTop: "1px solid var(--a-border-sub)" }}>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--a-text-6)" }}>Якість:</span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--a-text-4)" }}>
            <span className="w-3.5 h-3.5 rounded flex items-center justify-center text-[7px] font-bold" style={{ color: "#f97316", background: "#f9731618" }}>Ф</span> Фото
          </span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--a-text-4)" }}>
            <span className="w-3.5 h-3.5 rounded flex items-center justify-center text-[7px] font-bold" style={{ color: "#f59e0b", background: "#f59e0b18" }}>О</span> Опис
          </span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--a-text-4)" }}>
            <span className="w-3.5 h-3.5 rounded flex items-center justify-center text-[7px] font-bold" style={{ color: "#ef4444", background: "#ef444418" }}>S</span> SEO
          </span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--a-text-4)" }}>
            <span className="w-3.5 h-3.5 rounded flex items-center justify-center text-[7px]" style={{ color: "#4ade80", background: "#052e1680" }}>✓</span> Все ОК
          </span>
        </div>

        {/* Pagination */}
        {tp > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--a-border)" }}>
            <p className="text-xs" style={{ color: "var(--a-text-5)" }}>
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} з {total}
            </p>
            <div className="flex gap-1">
              {page > 1 && <Link href={qp(page - 1)} className="px-2.5 py-1 rounded-lg text-xs" style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)" }}>←</Link>}
              {pages[0] > 1 && <span className="px-1 py-1 text-xs" style={{ color: "var(--a-text-5)" }}>...</span>}
              {pages.map((pg) => (
                <Link key={pg} href={qp(pg)} className="px-2.5 py-1 rounded-lg text-xs font-medium"
                  style={pg === page ? { color: "var(--a-accent)", background: "var(--a-accent-bg)" } : { color: "var(--a-text-3)", background: "var(--a-bg-input)" }}>
                  {pg}
                </Link>
              ))}
              {pages[pages.length - 1] < tp && <span className="px-1 py-1 text-xs" style={{ color: "var(--a-text-5)" }}>...</span>}
              {page < tp && <Link href={qp(page + 1)} className="px-2.5 py-1 rounded-lg text-xs" style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)" }}>→</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
