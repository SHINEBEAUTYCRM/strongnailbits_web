import { FolderTree } from "lucide-react";
import { getCategories } from "@/lib/admin/data";

type Category = {
  id: string;
  cs_cart_id: number;
  parent_cs_cart_id: number | null;
  name_uk: string;
  slug: string;
  status: string;
  product_count: number;
  position: number;
};

function buildTree(cats: Category[]): (Category & { children: Category[] })[] {
  const map = new Map<number, Category & { children: Category[] }>();
  const roots: (Category & { children: Category[] })[] = [];

  for (const c of cats) {
    map.set(c.cs_cart_id, { ...c, children: [] });
  }
  for (const c of cats) {
    const node = map.get(c.cs_cart_id)!;
    if (c.parent_cs_cart_id && map.has(c.parent_cs_cart_id)) {
      map.get(c.parent_cs_cart_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function CategoryRow({ cat, depth = 0 }: { cat: Category & { children: Category[] }; depth?: number }) {
  const statusColor = cat.status === "active" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/30";
  return (
    <>
      <tr className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
            {cat.children.length > 0 && <FolderTree className="w-3.5 h-3.5 text-white/20 shrink-0" />}
            <span className="text-sm text-white/80">{cat.name_uk}</span>
          </div>
        </td>
        <td className="px-4 py-2.5 text-white/40 text-xs font-mono">{cat.slug}</td>
        <td className="px-4 py-2.5 text-right text-white/50 text-xs tabular-nums">{cat.product_count}</td>
        <td className="px-4 py-2.5 text-center">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor}`}>
            {cat.status === "active" ? "Актив" : cat.status}
          </span>
        </td>
      </tr>
      {cat.children.map((child) => (
        <CategoryRow key={child.id} cat={child as Category & { children: Category[] }} depth={depth + 1} />
      ))}
    </>
  );
}

export default async function CategoriesPage() {
  const categories = await getCategories();
  const tree = buildTree(categories as Category[]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-3">
          <FolderTree className="w-6 h-6 text-purple-400" />
          Категорії
        </h1>
        <p className="text-sm text-white/40">{categories.length} категорій</p>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Назва</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Slug</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Товарів</th>
              <th className="text-center px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Статус</th>
            </tr>
          </thead>
          <tbody>
            {tree.map((cat) => (
              <CategoryRow key={cat.id} cat={cat} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
