import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildPhotoPath, getPublicImageUrl } from '@/lib/enrichment/image-utils';

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const formData = await req.formData();
  const productId = formData.get('product_id') as string;
  const files = formData.getAll('photos') as File[];

  if (!productId || files.length === 0) {
    return NextResponse.json({ error: 'product_id та photos обовʼязкові' }, { status: 400 });
  }

  const { data: product } = await supabase
    .from('products')
    .select('id, slug, brand_id, photo_sources, main_image_url')
    .eq('id', productId)
    .single();

  if (!product) return NextResponse.json({ error: 'Товар не знайдено' }, { status: 404 });

  let brandSlug = 'unknown';
  if (product.brand_id) {
    const { data: brand } = await supabase.from('brands').select('slug').eq('id', product.brand_id).single();
    if (brand) brandSlug = brand.slug;
  }

  const productSlug = product.slug || productId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingSources: any[] = product.photo_sources || [];
  const uploaded = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const type = existingSources.length === 0 && i === 0 ? 'main' : 'bottle';
    const path = buildPhotoPath(brandSlug, productSlug, type, existingSources.length + i);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from('product-photos')
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (error) { console.error('Upload error:', error); continue; }

    const photo = {
      url: getPublicImageUrl(path),
      storage_path: path,
      source: 'manual',
      type,
    };
    uploaded.push(photo);
    existingSources.push(photo);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = { photo_sources: existingSources };
  if (!product.main_image_url && uploaded.length > 0) {
    updateData.main_image_url = uploaded[0].url;
  }

  await supabase.from('products').update(updateData).eq('id', productId);

  return NextResponse.json({ photos: uploaded, total: existingSources.length });
}
