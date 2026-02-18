import { notFound } from 'next/navigation';
import { getBrandById, getBrandProductCount } from '@/lib/admin/data';
import { BrandForm } from '@/components/admin/BrandForm';

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [brand, productCount] = await Promise.all([
    getBrandById(id),
    getBrandProductCount(id),
  ]);

  if (!brand) notFound();

  const initial = {
    id: brand.id,
    name: brand.name || '',
    slug: brand.slug || '',
    description_uk: brand.description_uk || '',
    description_ru: brand.description_ru || '',
    logo_url: brand.logo_url || '',
    banner_url: brand.banner_url || '',
    country: brand.country || '',
    website_url: brand.website_url || '',
    is_featured: Boolean(brand.is_featured),
    position: String(brand.position ?? 0),
    status: brand.status || 'active',
    meta_title: brand.meta_title || '',
    meta_description: brand.meta_description || '',
    source_urls: brand.source_urls || [],
    source_notes: brand.source_notes || '',
    ai_prompt_context: brand.ai_prompt_context || '',
  };

  return <BrandForm initial={initial} productCount={productCount} />;
}
