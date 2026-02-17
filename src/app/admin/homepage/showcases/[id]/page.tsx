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
      .is("parent_cs_cart_id", null)
      .order("position"),
    supabase
      .from("categories")
      .select("id, name_uk, cs_cart_id, parent_cs_cart_id, slug, product_count")
      .eq("status", "active")
      .not("parent_cs_cart_id", "is", null)
      .gt("product_count", 0)
      .order("name_uk"),
    supabase
      .from("brands")
      .select("id, name, slug, logo_url")
      .order("name"),
  ]);

  const catalogData = {
    rootCategories: rootCatsRes.data || [],
    subCategories: subCatsRes.data || [],
    brands: brandsRes.data || [],
  };

  if (id === "new") {
    return <ShowcaseForm catalogData={catalogData} />;
  }

  const showcase = await getShowcaseById(id);
  if (!showcase) return notFound();

  return <ShowcaseForm initial={showcase} catalogData={catalogData} />;
}
