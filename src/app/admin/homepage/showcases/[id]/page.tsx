import { notFound } from "next/navigation";
import { getShowcaseById } from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { ShowcaseForm } from "../ShowcaseForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ShowcaseEditPage({ params }: Props) {
  const { id } = await params;

  const supabase = createAdminClient();

  const [rootCatsRes, subCatsRes, brandsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name_uk, cs_cart_id, slug, product_count")
      .eq("status", "active")
      .or("parent_cs_cart_id.is.null,parent_cs_cart_id.eq.0")
      .order("position"),
    supabase
      .from("categories")
      .select("id, name_uk, cs_cart_id, parent_cs_cart_id, slug, product_count")
      .eq("status", "active")
      .not("parent_cs_cart_id", "is", null)
      .neq("parent_cs_cart_id", 0)
      .gt("product_count", 0)
      .order("name_uk"),
    supabase
      .from("brands")
      .select("id, name, slug, logo_url")
      .order("name"),
  ]);

  const rawRoots = rootCatsRes.data || [];
  const subs = subCatsRes.data || [];

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const enrichedRoots = rawRoots
    .map((root: any) => {
      const children = subs.filter((c: any) => c.parent_cs_cart_id === root.cs_cart_id);
      const totalProducts =
        children.reduce((sum: number, c: any) => sum + (c.product_count || 0), 0) +
        (root.product_count || 0);
      return { ...root, product_count: totalProducts, childCount: children.length };
    })
    .filter((r: any) => r.product_count > 0);

  const catalogData = {
    rootCategories: enrichedRoots,
    subCategories: subs,
    brands: brandsRes.data || [],
  };

  if (id === "new") {
    return <ShowcaseForm catalogData={catalogData} />;
  }

  const showcase = await getShowcaseById(id);
  if (!showcase) return notFound();

  return <ShowcaseForm initial={showcase} catalogData={catalogData} />;
}
