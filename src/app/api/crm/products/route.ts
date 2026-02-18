// ================================================================
//  GET /api/crm/products — пошук / список товарів для CRM
// ================================================================

import { NextRequest } from 'next/server';
import { requireCrmAuth, handleCorsOptions, crmJson } from '@/lib/crm-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const SHOP_URL = 'https://shineshopb2b.com';

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

export async function GET(req: NextRequest) {
  const authError = await requireCrmAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get('q')?.trim() || null;
    const category = searchParams.get('category')?.trim() || null;
    const brand = searchParams.get('brand')?.trim() || null;
    const inStock = searchParams.get('in_stock') === 'true';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    const supabase = createAdminClient();

    // Якщо фільтр по slug — знайти UUID
    let brandId: string | null = null;
    let categoryId: string | null = null;

    if (brand) {
      const { data: b } = await supabase
        .from('brands')
        .select('id')
        .eq('slug', brand)
        .single();
      if (!b) {
        return crmJson({ products: [], total: 0, limit, offset });
      }
      brandId = b.id;
    }

    if (category) {
      const { data: c } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single();
      if (!c) {
        return crmJson({ products: [], total: 0, limit, offset });
      }
      categoryId = c.id;
    }

    // Build query (LEFT JOIN — товари без бренда/категорії теж потрапляють)
    let query = supabase
      .from('products')
      .select(
        `
        id, name_uk, slug, sku,
        price, old_price, wholesale_price,
        quantity, status, main_image_url, images,
        brands ( name, slug, logo_url ),
        categories ( name_uk, slug )
      `,
        { count: 'exact' }
      )
      .eq('status', 'active');

    // Пошук по назві або SKU
    if (q) {
      query = query.or(`name_uk.ilike.%${q}%,sku.ilike.%${q}%`);
    }

    // Фільтр по категорії (по UUID)
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    // Фільтр по бренду (по UUID)
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }

    // Тільки в наявності
    if (inStock) {
      query = query.gt('quantity', 0);
    }

    // Сортування та пагінація
    query = query
      .order('position', { ascending: true })
      .order('name_uk', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: products, error, count } = await query;

    if (error) {
      console.error('[CRM API] Products query error:', error);
      return crmJson({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // Форматуємо відповідь
    const formatted = (products || []).map((p: Record<string, unknown>) => {
      const brandsRaw = p.brands as unknown;
      const brandData = Array.isArray(brandsRaw) ? brandsRaw[0] as Record<string, unknown> | undefined : brandsRaw as Record<string, unknown> | null;
      const categoriesRaw = p.categories as unknown;
      const categoryData = Array.isArray(categoriesRaw) ? categoriesRaw[0] as Record<string, unknown> | undefined : categoriesRaw as Record<string, unknown> | null;

      return {
        id: p.id,
        name: p.name_uk,
        slug: p.slug,
        sku: p.sku,
        price: Number(p.price),
        old_price: p.old_price ? Number(p.old_price) : null,
        wholesale_price: p.wholesale_price ? Number(p.wholesale_price) : null,
        quantity: p.quantity,
        in_stock: (p.quantity as number) > 0,
        image_url: p.main_image_url,
        images: p.images,
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
    });

    return crmJson({
      products: formatted,
      total: count || 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[CRM API] Products error:', err);
    return crmJson(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
