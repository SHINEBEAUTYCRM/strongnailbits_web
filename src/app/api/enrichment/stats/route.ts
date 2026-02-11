// GET /api/enrichment/stats?brand_id=
// Response: { total, with_photo, enriched, approved, pending, errors, by_brand: [] }

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { EnrichmentStats } from '@/lib/enrichment/types';

export async function GET(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const brandId = request.nextUrl.searchParams.get('brand_id');
  const supabase = createAdminClient();

  try {
    // Fetch ALL products in pages of 1000 (Supabase default limit)
    const allProducts: { id: string; brand_id: string | null; enrichment_status: string | null; photo_sources: unknown[] | null }[] = [];
    const PAGE_SIZE = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('products')
        .select('id, brand_id, enrichment_status, photo_sources')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (brandId) {
        query = query.eq('brand_id', brandId);
      }

      const { data, error } = await query;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (data && data.length > 0) {
        allProducts.push(...data);
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
      page++;
    }

    // Calculate stats
    const total = allProducts.length;
    const withPhoto = allProducts.filter(p =>
      p.photo_sources && Array.isArray(p.photo_sources) && p.photo_sources.length > 0,
    ).length;
    const enriched = allProducts.filter(p =>
      ['enriched', 'approved'].includes(p.enrichment_status || ''),
    ).length;
    const approved = allProducts.filter(p =>
      p.enrichment_status === 'approved',
    ).length;
    const pending = allProducts.filter(p =>
      p.enrichment_status === 'pending' || !p.enrichment_status,
    ).length;
    const errors = allProducts.filter(p =>
      p.enrichment_status === 'error',
    ).length;

    // Per-brand stats
    const { data: brands } = await supabase
      .from('brands')
      .select('id, name, slug')
      .order('name');

    const brandStats = (brands || []).map((brand: { id: string; name: string; slug: string }) => {
      const brandProducts = allProducts.filter(p => p.brand_id === brand.id);
      return {
        brand_id: brand.id,
        brand_name: brand.name,
        brand_slug: brand.slug,
        total: brandProducts.length,
        enriched: brandProducts.filter(p =>
          ['enriched', 'approved'].includes(p.enrichment_status || ''),
        ).length,
        approved: brandProducts.filter(p =>
          p.enrichment_status === 'approved',
        ).length,
        errors: brandProducts.filter(p =>
          p.enrichment_status === 'error',
        ).length,
      };
    }).filter(b => b.total > 0);

    const stats: EnrichmentStats = {
      total,
      with_photo: withPhoto,
      enriched,
      approved,
      pending,
      errors,
      by_brand: brandStats,
    };

    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to get stats',
    }, { status: 500 });
  }
}
