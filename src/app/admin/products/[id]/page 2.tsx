import { notFound } from "next/navigation";
import { getProductById, getCategoryList, getBrandList } from "@/lib/admin/data";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories, brands] = await Promise.all([
    getProductById(id),
    getCategoryList(),
    getBrandList(),
  ]);

  if (!product) notFound();

  const initial = {
    id: product.id,
    name_uk: product.name_uk || "",
    name_ru: product.name_ru || "",
    slug: product.slug || "",
    sku: product.sku || "",
    description_uk: product.description_uk || "",
    description_ru: product.description_ru || "",
    price: product.price != null ? String(product.price) : "",
    old_price: product.old_price != null ? String(product.old_price) : "",
    wholesale_price: product.wholesale_price != null ? String(product.wholesale_price) : "",
    cost_price: product.cost_price != null ? String(product.cost_price) : "",
    quantity: String(product.quantity ?? 0),
    status: product.status || "active",
    main_image_url: product.main_image_url || "",
    images: Array.isArray(product.images) ? (product.images as string[]) : [],
    weight: product.weight != null ? String(product.weight) : "",
    meta_title: product.meta_title || "",
    meta_description: product.meta_description || "",
    is_featured: Boolean(product.is_featured),
    is_new: Boolean(product.is_new),
    position: String(product.position ?? 0),
    category_id: product.category_id || "",
    brand_id: product.brand_id || "",
  };

  return <ProductForm initial={initial} categories={categories} brands={brands} />;
}
