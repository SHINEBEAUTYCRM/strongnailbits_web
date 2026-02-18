import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function wordCount(html: string | null): number {
  if (!html) return 0;
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}

type Completeness = 'none' | 'short' | 'few' | 'partial' | 'full';

function photoStatus(mainImg: string | null, images: unknown): Completeness {
  const count = (mainImg ? 1 : 0) + (Array.isArray(images) ? images.length : 0);
  if (count === 0) return 'none';
  if (count <= 2) return 'few';
  return 'full';
}

function descStatus(desc: string | null): Completeness {
  const words = wordCount(desc);
  if (words === 0) return 'none';
  if (words < 100) return 'short';
  return 'full';
}

function seoStatus(title: string | null, description: string | null): Completeness {
  const hasTitle = !!title?.trim();
  const hasDesc = !!description?.trim();
  if (!hasTitle && !hasDesc) return 'none';
  if (hasTitle && hasDesc) return 'full';
  return 'partial';
}

function completenessScore(photo: Completeness, descUk: Completeness, descRu: Completeness, seo: Completeness): number {
  const map: Record<string, number> = { none: 0, short: 0.5, few: 0.5, partial: 0.5, full: 1 };
  return Math.round(((map[photo] + map[descUk] + map[descRu] + map[seo]) / 4) * 100);
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const brandId = url.searchParams.get('brand_id');
    const categoryId = url.searchParams.get('category_id');
    const status = url.searchParams.get('status');
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Number(url.searchParams.get('limit')) || 25;
    const sort = url.searchParams.get('sort') || 'name';
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();

    let query = supabase
      .from('products')
      .select('id, sku, name_uk, name_ru, slug, price, quantity, main_image_url, images, description_uk, description_ru, meta_title, meta_description, brand_id, category_id, brands(name), categories(name_uk)', { count: 'exact' });

    if (brandId) query = query.eq('brand_id', brandId);
    if (categoryId) query = query.eq('category_id', categoryId);

    if (status === 'no_desc_uk') query = query.or('description_uk.is.null,description_uk.eq.');
    else if (status === 'no_desc_ru') query = query.or('description_ru.is.null,description_ru.eq.');
    else if (status === 'no_photo') query = query.is('main_image_url', null);
    else if (status === 'no_seo') query = query.or('meta_title.is.null,meta_description.is.null');

    if (sort === 'name') query = query.order('name_uk', { ascending: true });
    else if (sort === 'updated') query = query.order('updated_at', { ascending: false });
    else query = query.order('name_uk', { ascending: true });

    query = query.range(offset, offset + limit - 1);

    const { data: products, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (products || []).map(p => {
      const photo = photoStatus(p.main_image_url, p.images);
      const descUk = descStatus(p.description_uk);
      const descRu = descStatus(p.description_ru);
      const seo = seoStatus(p.meta_title, p.meta_description);

      return {
        id: p.id,
        sku: p.sku,
        name_uk: p.name_uk,
        name_ru: p.name_ru,
        slug: p.slug,
        price: Number(p.price),
        quantity: p.quantity,
        main_image_url: p.main_image_url,
        images: p.images || [],
        description_uk: p.description_uk,
        description_ru: p.description_ru,
        meta_title: p.meta_title,
        meta_description: p.meta_description,
        brand_name: (p.brands as { name?: string } | null)?.name || null,
        brand_id: p.brand_id,
        category_path: (p.categories as { name_uk?: string } | null)?.name_uk || null,
        category_id: p.category_id,
        photo_count: (p.main_image_url ? 1 : 0) + (Array.isArray(p.images) ? (p.images as string[]).length : 0),
        desc_uk_words: wordCount(p.description_uk),
        desc_ru_words: wordCount(p.description_ru),
        completeness: { photo, descUk, descRu, seo },
        completeness_score: completenessScore(photo, descUk, descRu, seo),
      };
    });

    // Sort by completeness if requested
    if (sort === 'completeness_asc') items.sort((a, b) => a.completeness_score - b.completeness_score);
    else if (sort === 'completeness_desc') items.sort((a, b) => b.completeness_score - a.completeness_score);

    // Counts for summary
    const totalCount = count || 0;

    return NextResponse.json({
      products: items,
      total: totalCount,
      page,
      limit,
    });
  } catch (err) {
    console.error('[AI Products Status]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
