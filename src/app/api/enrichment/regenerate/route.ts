// POST /api/enrichment/regenerate
// Body: { product_id, fields: string[] }
// Re-runs AI for specific fields

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { regenerateFields } from '@/lib/enrichment/ai-enrichment';
import type { EnrichmentProduct, EnrichmentBrand } from '@/lib/enrichment/types';

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { product_id, fields } = body;

  if (!product_id) {
    return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
  }

  if (!Array.isArray(fields) || fields.length === 0) {
    return NextResponse.json({ error: 'fields array is required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get product with brand
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*, brands!brand_id(*), categories!category_id(name_uk)')
    .eq('id', product_id)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const enrichmentProduct: EnrichmentProduct = {
    ...product,
    brand: product.brands as unknown as EnrichmentBrand,
    category_name: (product.categories as { name_uk: string } | null)?.name_uk || undefined,
    ai_metadata: product.ai_metadata || {},
    raw_parsed_data: product.raw_parsed_data || {},
    photo_sources: product.photo_sources || [],
  };

  if (!enrichmentProduct.brand) {
    return NextResponse.json({ error: 'Product has no brand' }, { status: 400 });
  }

  try {
    const { updatedMetadata, tokens } = await regenerateFields(
      enrichmentProduct,
      enrichmentProduct.brand,
      fields,
    );

    await supabase
      .from('products')
      .update({
        ai_metadata: updatedMetadata,
        enrichment_date: new Date().toISOString(),
        enriched_by: admin.email,
      })
      .eq('id', product_id);

    // Log
    await supabase.from('enrichment_log').insert({
      product_id,
      brand_id: product.brand_id,
      action: 'regenerate',
      status: 'success',
      details: { fields, tokens, regenerated_by: admin.email },
    });

    return NextResponse.json({
      success: true,
      updated_metadata: updatedMetadata,
      tokens,
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Regeneration failed',
    }, { status: 500 });
  }
}
