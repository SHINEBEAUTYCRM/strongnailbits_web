import { getCategoryList, getBrandList } from "@/lib/admin/data";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const [categories, brands] = await Promise.all([getCategoryList(), getBrandList()]);
  return <ProductForm categories={categories} brands={brands} />;
}
