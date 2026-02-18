// ================================================================
//  ShineShop OS — Product Search for Image Studio
//  GET /api/admin/products/search?q=keyword&limit=20
//  Пошук товарів з зображеннями для AI Image Studio
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const CACHE_TTL = 30; // секунд

export async function GET(request: NextRequest) {
  try {
    // 1. Авторизація
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    // 2. Параметри
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      MAX_LIMIT
    );

    if (!q) {
      return NextResponse.json(
        { error: 'Параметр q обов\'язковий' },
        { status: 400 }
      );
    }

    // 3. Пошук в Supabase
    const supabase = createAdminClient();
    const pattern = `%${q}%`;

    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, brand, main_image, additional_images')
      .not('main_image', 'is', null)
      .or(`name.ilike.${pattern},sku.ilike.${pattern},brand.ilike.${pattern}`)
      .limit(limit)
      .order('name', { ascending: true });

    if (error) {
      console.error('[Product Search] Supabase error:', error.message);
      return NextResponse.json(
        { error: 'Помилка пошуку' },
        { status: 500 }
      );
    }

    // 4. Повернути з кешуванням
    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': `private, max-age=${CACHE_TTL}`,
      },
    });
  } catch (err) {
    console.error('[Product Search] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Невідома помилка' },
      { status: 500 }
    );
  }
}
