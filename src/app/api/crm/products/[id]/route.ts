// ================================================================
//  GET /api/crm/products/[id] — один товар за UUID
// ================================================================

import { NextRequest } from 'next/server';
import { requireCrmAuth, handleCorsOptions, crmJson } from '@/lib/crm-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const SHOP_URL = 'https://shineshopb2b.com';

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireCrmAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;

    const supabase = createAdminClient();

    const { data: p, error } = await supabase
      .from('products')
      .select(
        `
        id, name_uk, slug, sku,
        price, old_price, wholesale_price,
        quantity, status, main_image_url, images,
        description_uk, properties, weight,
        brands ( name, slug, logo_url ),
        categories ( name_uk, slug )
      `
      )
      .eq('id', id)
      .single();

    if (error || !p) {
      return crmJson({ error: 'Product not found' }, { status: 404 });
    }

    const brandsRaw = p.brands as unknown;
    const brandData = Array.isArray(brandsRaw) ? brandsRaw[0] as Record<string, unknown> | undefined : brandsRaw as Record<string, unknown> | null;
    const categoriesRaw = p.categories as unknown;
    const categoryData = Array.isArray(categoriesRaw) ? categoriesRaw[0] as Record<string, unknown> | undefined : categoriesRaw as Record<string, unknown> | null;

    const product = {
      id: p.id,
      name: p.name_uk,
      slug: p.slug,
      sku: p.sku,
      price: Number(p.price),
      old_price: p.old_price ? Number(p.old_price) : null,
      wholesale_price: p.wholesale_price ? Number(p.wholesale_price) : null,
      quantity: p.quantity,
      in_stock: (p.quantity as number) > 0,
      status: p.status,
      image_url: p.main_image_url,
      images: p.images,
      description: p.description_uk,
      properties: p.properties,
      weight: p.weight ? Number(p.weight) : null,
      brand: brandData
        ? {
            name: brandData.name,
            slug: brandData.slug,
            logo: brandData.logo_url,
          }
        : null,
      category: categoryData
        ? {
            name: categoryData.name_uk,
            slug: categoryData.slug,
          }
        : null,
      url: `${SHOP_URL}/product/${p.slug}`,
    };

    return crmJson({ product });
  } catch (err) {
    console.error('[CRM API] Product [id] error:', err);
    return crmJson(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
