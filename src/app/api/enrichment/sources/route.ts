// GET /api/enrichment/sources?brand_id=
// Returns enrichment sources: brand-specific + marketplaces
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const brandId = request.nextUrl.searchParams.get('brand_id');
  const supabase = createAdminClient();

  // Brand-specific sources
  const brandSources = [];
  if (brandId) {
    // Check if brand has photo_source_url
    const { data: brand } = await supabase
      .from('brands')
      .select('id, name, photo_source_url, info_source_url')
      .eq('id', brandId)
      .single();

    if (brand?.photo_source_url) {
      brandSources.push({
        id: `brand-${brand.id}`,
        name: new URL(brand.photo_source_url).hostname,
        url: brand.photo_source_url,
        type: 'brand_site',
      });
    }

    // DB sources for this brand
    const { data: dbSources } = await supabase
      .from('enrichment_sources')
      .select('id, name, url, type')
      .or(`brand_id.eq.${brandId},brand_id.is.null`)
      .eq('is_active', true)
      .order('type');

    if (dbSources) {
      for (const s of dbSources) {
        if (!brandSources.find(bs => bs.url === s.url)) {
          brandSources.push(s);
        }
      }
    }
  } else {
    // All sources
    const { data } = await supabase
      .from('enrichment_sources')
      .select('id, name, url, type')
      .eq('is_active', true)
      .order('type');

    if (data) brandSources.push(...data);
  }

  return NextResponse.json({ sources: brandSources });
}
