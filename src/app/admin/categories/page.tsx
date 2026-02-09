import { FolderTree } from "lucide-react";
import { getCategories } from "@/lib/admin/data";

type Cat = { id: string; cs_cart_id: number; parent_cs_cart_id: number | null; name_uk: string; slug: string; status: string; product_count: number; position: number; description_uk: string | null };
type CatNode = Cat & { children: CatNode[] };

function buildTree(cats: Cat[]): CatNode[] {
  const map = new Map<number, CatNode>();
  const roots: CatNode[] = [];
  for (const c of cats) map.set(c.cs_cart_id, { ...c, children: [] });
  for (const c of cats) { const n = map.get(c.cs_cart_id)!; if (c.parent_cs_cart_id && map.has(c.parent_cs_cart_id)) map.get(c.parent_cs_cart_id)!.children.push(n); else roots.push(n); }
  return roots;
}

function strip(h: string) { return h.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim(); }

function CatRow({ cat, depth = 0 }: { cat: CatNode; depth?: number }) {
  const sc = cat.status === "active" ? { c: "#4ade80", bg: "#052e16" } : { c: "#71717a", bg: "#18181b" };
  const desc = cat.description_uk ? strip(cat.description_uk) : null;
  return (<>
    <tr style={{ borderBottom: "1px solid #141420" }}>
      <td className="px-4 py-2.5"><div style={{ paddingLeft: depth * 20 }}>
        <div className="flex items-center gap-2">{cat.children.length > 0 && <FolderTree className="w-3.5 h-3.5 shrink-0" style={{ color: "#3f3f46" }} />}<span className="text-sm" style={{ color: "#a1a1aa" }}>{cat.name_uk}</span></div>
        {desc && <p className="text-[11px] mt-0.5 line-clamp-2 leading-relaxed" style={{ color: "#3f3f46", paddingLeft: cat.children.length > 0 ? 22 : 0 }}>{desc}</p>}
      </div></td>
      <td className="px-4 py-2.5 text-xs font-mono align-top" style={{ color: "#52525b" }}>{cat.slug}</td>
      <td className="px-4 py-2.5 text-right text-xs tabular-nums align-top" style={{ color: "#71717a" }}>{cat.product_count}</td>
      <td className="px-4 py-2.5 text-center align-top"><span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: sc.c, background: sc.bg }}>{cat.status === "active" ? "Актив" : cat.status}</span></td>
    </tr>
    {cat.children.map((ch) => <CatRow key={ch.id} cat={ch} depth={depth + 1} />)}
  </>);
}

export default async function CategoriesPage() {
  const categories = await getCategories();
  const tree = buildTree(categories as Cat[]);
  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-semibold mb-1 flex items-center gap-3" style={{ color: "#f4f4f5" }}><FolderTree className="w-6 h-6" style={{ color: "#a855f7" }} />Категорії</h1><p className="text-sm" style={{ color: "#52525b" }}>{categories.length} категорій</p></div>
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}>
        <table className="w-full text-sm"><thead><tr style={{ borderBottom: "1px solid #1e1e2a" }}>
          <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Назва / Опис</th>
          <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Slug</th>
          <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Товарів</th>
          <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Статус</th>
        </tr></thead><tbody>{tree.map((c) => <CatRow key={c.id} cat={c} />)}</tbody></table>
      </div>
    </div>
  );
}
