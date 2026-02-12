// GET /api/enrichment/stats
import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();

  // Fetch all products in pages (avoid Supabase 1000 limit)
  const allProducts: { id: string; description_uk: string | null; main_image_url: string | null; enrichment_status: string | null }[] = [];
  const PAGE_SIZE = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('products')
      .select('id, description_uk, main_image_url, enrichment_status')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (data && data.length > 0) {
      allProducts.push(...data);
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
    page++;
  }

  const total = allProducts.length;
  const noDescription = allProducts.filter(p => !p.description_uk).length;
  const noPhoto = allProducts.filter(p => !p.main_image_url).length;
  const enriched = allProducts.filter(p => ['enriched', 'approved'].includes(p.enrichment_status || '')).length;
  const approved = allProducts.filter(p => p.enrichment_status === 'approved').length;
  const errors = allProducts.filter(p => p.enrichment_status === 'error').length;

  return NextResponse.json({
    total,
    no_description: noDescription,
    no_photo: noPhoto,
    enriched,
    approved,
    errors,
  });
}
