import { notFound } from "next/navigation";
import { getCategoryById, getCategories, getCategoryProductCount } from "@/lib/admin/data";
import { CategoryForm } from "@/components/admin/CategoryForm";

type Cat = { cs_cart_id: number; parent_cs_cart_id: number | null; name_uk: string };
type CatWithDepth = { cs_cart_id: number; name_uk: string; depth: number };

function flattenTree(cats: Cat[], excludeCsCartId?: number): CatWithDepth[] {
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
    if (excludeCsCartId && node.cs_cart_id === excludeCsCartId) return;
    result.push({ cs_cart_id: node.cs_cart_id, name_uk: node.name_uk, depth });
    for (const ch of (node as Cat & { children: (Cat & { children: Cat[] })[] }).children) walk(ch, depth + 1);
  }
  for (const r of roots) walk(r, 0);
  return result;
}

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [category, allCategories, productCount] = await Promise.all([
    getCategoryById(id),
    getCategories(),
    getCategoryProductCount(id),
  ]);

  if (!category) notFound();

  const parents = flattenTree(
    allCategories as Cat[],
    category.cs_cart_id, // exclude self from parent options
  );

  const initial = {
    id: category.id,
    name_uk: category.name_uk || "",
    name_ru: category.name_ru || "",
    slug: category.slug || "",
    description_uk: category.description_uk || "",
    description_ru: category.description_ru || "",
    image_url: category.image_url || "",
    position: String(category.position ?? 0),
    status: category.status || "active",
    parent_cs_cart_id: category.parent_cs_cart_id ? String(category.parent_cs_cart_id) : "",
  };

  return <CategoryForm initial={initial} parents={parents} productCount={productCount} />;
}
