// POST /api/enrichment/approve
// Body: { product_id, description_uk, specs, tags, compatible_products, selected_photos }
// OR: { product_ids } for bulk approve (just status change)
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const supabase = createAdminClient();

  // Bulk approve (just status)
  if (Array.isArray(body.product_ids) && body.product_ids.length > 0) {
    const { error } = await supabase
      .from('products')
      .update({
        enrichment_status: 'approved',
        enriched_by: admin.name,
      })
      .in('id', body.product_ids);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, approved: body.product_ids.length });
  }

  // Single product approve with full data
  const { product_id, description_uk, specs, tags, compatible_products, selected_photos } = body;
  if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    enrichment_status: 'approved',
    enriched_by: admin.name,
  };

  if (description_uk) updateData.description_uk = description_uk;

  const aiMetadata: Record<string, unknown> = {};
  if (specs) aiMetadata.specs = specs;
  if (tags) {
    aiMetadata.season_tags = tags.season || [];
    aiMetadata.style_tags = tags.style || [];
  }
  if (compatible_products) aiMetadata.compatible_products = compatible_products;
  if (Object.keys(aiMetadata).length > 0) updateData.ai_metadata = aiMetadata;

  if (selected_photos) updateData.photo_sources = selected_photos;

  const { error } = await supabase.from('products').update(updateData).eq('id', product_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log
  await supabase.from('enrichment_log').insert({
    product_id,
    action: 'approve',
    status: 'success',
    details: { approved_by: admin.name },
  });

  return NextResponse.json({ success: true });
}
