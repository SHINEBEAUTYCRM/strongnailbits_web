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
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name_uk, parent_id, slug")
    .eq("status", "active")
    .order("name_uk");

  if (id === "new") {
    return <ShowcaseForm categories={categories || []} />;
  }

  const showcase = await getShowcaseById(id);
  if (!showcase) return notFound();

  return <ShowcaseForm initial={showcase} categories={categories || []} />;
}
