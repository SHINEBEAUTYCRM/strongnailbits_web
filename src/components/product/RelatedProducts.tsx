import { createAdminClient } from "@/lib/supabase/admin";
import { getLanguage, localizedName } from "@/lib/language-server";
import { RelatedCarousel } from "./RelatedCarousel";

interface Props {
  categoryId: string;
  excludeProductId: string;
}

export async function RelatedProducts({ categoryId, excludeProductId }: Props) {
  const lang = await getLanguage();
  const supabase = createAdminClient();

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, slug, name_uk, name_ru, price, old_price, main_image_url, status, is_new, quantity, brands(name)",
    )
    .eq("category_id", categoryId)
    .eq("status", "active")
    .gt("quantity", 0)
    .neq("id", excludeProductId)
    .order("position", { ascending: true })
    .limit(12);

  if (!products || products.length === 0) return null;

  const items = products.map((p) => {
    const bd = p.brands as { name: string } | { name: string }[] | null;
    const brandName = Array.isArray(bd) ? bd[0]?.name : bd?.name;
    return {
      id: p.id,
      slug: p.slug,
      name: localizedName(p, lang),
      price: p.price,
      oldPrice: p.old_price,
      imageUrl: p.main_image_url,
      brand: brandName ?? null,
      isNew: p.is_new,
      status: p.status,
      quantity: p.quantity,
    };
  });

  return (
    <section className="mt-16">
      <h2 className="mb-5 text-[20px] font-bold text-[#222]">
        Подивіться ще
      </h2>
      <RelatedCarousel items={items} />
    </section>
  );
}
