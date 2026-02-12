import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildPhotoPath, getPublicImageUrl } from '@/lib/enrichment/image-utils';

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { product_id, image_url } = await req.json();

  if (!product_id || !image_url) {
    return NextResponse.json({ error: 'product_id та image_url обовʼязкові' }, { status: 400 });
  }

  // Download image
  let imageResponse: Response;
  try {
    imageResponse = await fetch(image_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
        'Referer': new URL(image_url).origin,
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return NextResponse.json({ error: 'Таймаут або мережева помилка' }, { status: 400 });
  }

  if (!imageResponse.ok) {
    return NextResponse.json({ error: `Сервер відповів ${imageResponse.status}` }, { status: 400 });
  }

  const contentType = imageResponse.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'URL не є зображенням' }, { status: 400 });
  }

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  if (buffer.length < 5000) {
    return NextResponse.json({ error: 'Зображення занадто маленьке (заглушка)' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: product } = await supabase
    .from('products')
    .select('id, slug, brand_id, photo_sources, main_image_url')
    .eq('id', product_id)
    .single();

  if (!product) return NextResponse.json({ error: 'Товар не знайдено' }, { status: 404 });

  let brandSlug = 'unknown';
  if (product.brand_id) {
    const { data: brand } = await supabase.from('brands').select('slug').eq('id', product.brand_id).single();
    if (brand) brandSlug = brand.slug;
  }

  const productSlug = product.slug || product_id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingSources: any[] = product.photo_sources || [];
  const type = existingSources.length === 0 ? 'main' : 'bottle';
  const path = buildPhotoPath(brandSlug, productSlug, type, existingSources.length);

  const { error: uploadError } = await supabase.storage
    .from('product-photos')
    .upload(path, buffer, { contentType, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: 'Помилка збереження: ' + uploadError.message }, { status: 500 });
  }

  const sourceHostname = new URL(image_url).hostname;
  const photo = {
    url: getPublicImageUrl(path),
    storage_path: path,
    source: 'parsed',
    from: sourceHostname,
    type,
    original_url: image_url,
  };

  existingSources.push(photo);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = { photo_sources: existingSources };
  if (!product.main_image_url) {
    updateData.main_image_url = photo.url;
  }

  await supabase.from('products').update(updateData).eq('id', product_id);

  return NextResponse.json({ photo, total: existingSources.length });
}
