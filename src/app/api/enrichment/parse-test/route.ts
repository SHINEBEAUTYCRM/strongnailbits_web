// POST /api/enrichment/parse-test
// Body: { brand_id, product_id? }
// Response: RawParsedData (preview of parsing 1 product)

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { testParser, findProductPage, parseProductPage } from '@/lib/enrichment/parser';
import type { EnrichmentBrand } from '@/lib/enrichment/types';

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { brand_id, product_id } = body;

  if (!brand_id) {
    return NextResponse.json({ error: 'brand_id is required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get brand
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brand_id)
    .single();

  if (brandError || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  }

  try {
    // Validate parse_config exists
    const parseConfig = brand.parse_config as EnrichmentBrand['parse_config'] | null;
    if (!parseConfig?.selectors) {
      return NextResponse.json(
        { error: 'Brand has no parse_config. Run auto-detect first.' },
        { status: 400 },
      );
    }

    // If product_id specified — test on that specific product
    if (product_id) {
      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', product_id)
        .single();

      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      const pageUrl = await findProductPage(brand as EnrichmentBrand, product);
      if (!pageUrl) {
        return NextResponse.json({
          error: 'Product page not found on brand website',
          product_name: product.name_uk,
          sku: product.sku,
        }, { status: 404 });
      }

      const parsed = await parseProductPage(pageUrl, parseConfig.selectors, parseConfig.parse_options);

      return NextResponse.json({
        url: pageUrl,
        parsed,
        product_name: product.name_uk,
        sku: product.sku,
      });
    }

    // Otherwise — test on any product from brand's website
    const result = await testParser(brand as EnrichmentBrand);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Parse test failed',
    }, { status: 500 });
  }
}
