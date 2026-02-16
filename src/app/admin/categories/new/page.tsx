import { getCategories } from "@/lib/admin/data";
import { CategoryForm } from "@/components/admin/CategoryForm";

type Cat = { cs_cart_id: number; parent_cs_cart_id: number | null; name_uk: string };
type CatWithDepth = { cs_cart_id: number; name_uk: string; depth: number };

function flattenTree(cats: Cat[]): CatWithDepth[] {
  const map = new Map<number, Cat & { children: Cat[] }>();
  const roots: (Cat & { children: Cat[] })[] = [];
  for (const c of cats) map.set(c.cs_cart_id, { ...c, children: [] });
  for (const c of cats) {
    const n = map.get(c.cs_cart_id)!;
    if (c.parent_cs_cart_id && map.has(c.parent_cs_cart_id)) map.get(c.parent_cs_cart_id)!.children.push(n);
    else roots.push(n);
  }
  const result: CatWithDepth[] = [];
  function walk(node: Cat & { children: Cat[] }, depth: number) {
    result.push({ cs_cart_id: node.cs_cart_id, name_uk: node.name_uk, depth });
    for (const ch of (node as Cat & { children: (Cat & { children: Cat[] })[] }).children) walk(ch, depth + 1);
  }
  for (const r of roots) walk(r, 0);
  return result;
}

export default async function NewCategoryPage() {
  const allCategories = await getCategories();
  const parents = flattenTree(allCategories as Cat[]);
  return <CategoryForm parents={parents} />;
}
