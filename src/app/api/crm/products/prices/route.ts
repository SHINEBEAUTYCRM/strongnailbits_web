// ================================================================
//  POST /api/crm/products/prices — batch перевірка цін
// ================================================================

import { NextRequest } from 'next/server';
import { requireCrmAuth, handleCorsOptions, crmJson } from '@/lib/crm-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

export async function POST(req: NextRequest) {
  const authError = await requireCrmAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const ids: string[] = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return crmJson(
        { error: 'ids must be a non-empty array of UUIDs' },
        { status: 400 }
      );
    }

    if (ids.length > 100) {
      return crmJson(
        { error: 'Maximum 100 ids per request' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: products, error } = await supabase
      .from('products')
      .select('id, price, old_price, wholesale_price, quantity, status')
      .in('id', ids);

    if (error) {
      console.error('[CRM API] Prices query error:', error);
      return crmJson({ error: 'Failed to fetch prices' }, { status: 500 });
    }

    const prices: Record<
      string,
      {
        price: number;
        old_price: number | null;
        wholesale_price: number | null;
        in_stock: boolean;
        quantity: number;
      }
    > = {};

    for (const p of products || []) {
      prices[p.id] = {
        price: Number(p.price),
        old_price: p.old_price ? Number(p.old_price) : null,
        wholesale_price: p.wholesale_price ? Number(p.wholesale_price) : null,
        in_stock: (p.quantity as number) > 0 && p.status === 'active',
        quantity: p.quantity as number,
      };
    }

    return crmJson({ prices });
  } catch (err) {
    console.error('[CRM API] Prices error:', err);
    return crmJson(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
