import { notFound } from "next/navigation";
import { getBannerById, getCategories } from "@/lib/admin/data";
import { BannerForm } from "@/components/admin/banners/BannerForm";

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [banner, categories] = await Promise.all([
    getBannerById(id),
    getCategories(),
  ]);

  if (!banner) notFound();

  const cats = categories.map((c: any) => ({ id: c.id, name_uk: c.name_uk }));
  return <BannerForm initial={banner} categories={cats} />;
}
