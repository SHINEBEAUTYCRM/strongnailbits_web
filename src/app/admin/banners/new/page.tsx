import { getCategories } from "@/lib/admin/data";
import { BannerForm } from "@/components/admin/banners/BannerForm";

export default async function NewBannerPage() {
  const categories = await getCategories();
  const cats = categories.map((c: any) => ({ id: c.id, name_uk: c.name_uk }));
  return <BannerForm categories={cats} />;
}
