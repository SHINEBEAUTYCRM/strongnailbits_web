// ================================================================
//  POST /api/crm/orders — створити замовлення від CRM
// ================================================================

import { NextRequest } from 'next/server';
import { requireCrmAuth, handleCorsOptions, crmJson } from '@/lib/crm-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

interface OrderItem {
  product_id: string;
  quantity: number;
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

export async function POST(req: NextRequest) {
  const authError = await requireCrmAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();

    // ── Валідація items ──
    const items: OrderItem[] = body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return crmJson(
        { error: 'items must be a non-empty array' },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.product_id || typeof item.product_id !== 'string') {
        return crmJson(
          { error: 'Each item must have a valid product_id (UUID)' },
          { status: 400 }
        );
      }
      if (!item.quantity || item.quantity < 1) {
        return crmJson(
          { error: 'Each item must have quantity > 0' },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();

    // ── Отримати товари та перевірити наявність ──
    const productIds = items.map((i) => i.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name_uk, sku, price, wholesale_price, quantity, status')
      .in('id', productIds);

    if (productsError) {
      console.error('[CRM API] Order products query error:', productsError);
      return crmJson({ error: 'Failed to fetch products' }, { status: 500 });
    }

    const productMap = new Map(
      (products || []).map((p) => [p.id, p])
    );

    // Перевірити що всі product_id існують
    const missingIds = productIds.filter((id) => !productMap.has(id));
    if (missingIds.length > 0) {
      return crmJson(
        { error: `Products not found: ${missingIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Перевірити наявність
    const outOfStock: string[] = [];
    for (const item of items) {
      const product = productMap.get(item.product_id)!;
      if (product.status !== 'active') {
        outOfStock.push(`${product.name_uk} (inactive)`);
      } else if ((product.quantity as number) < item.quantity) {
        outOfStock.push(
          `${product.name_uk} (requested: ${item.quantity}, available: ${product.quantity})`
        );
      }
    }

    if (outOfStock.length > 0) {
      return crmJson(
        { error: 'Insufficient stock', details: outOfStock },
        { status: 400 }
      );
    }

    // ── Зафіксувати ціни та порахувати subtotal ──
    let subtotal = 0;
    const orderItems = items.map((item) => {
      const product = productMap.get(item.product_id)!;
      const price = Number(product.wholesale_price || product.price);
      const total = price * item.quantity;
      subtotal += total;

      return {
        product_id: product.id,
        name: product.name_uk,
        sku: product.sku,
        quantity: item.quantity,
        price,
        total,
      };
    });

    // ── Згенерувати номер замовлення ──
    const year = new Date().getFullYear();

    // Порахувати існуючі замовлення цього року для seq
    const { count: orderCount } = await supabase
      .from('crm_orders')
      .select('id', { count: 'exact', head: true })
      .like('order_number', `CRM-${year}-%`);

    const seq = (orderCount || 0) + 1;
    const orderNumber = `CRM-${year}-${String(seq).padStart(4, '0')}`;

    // ── Створити замовлення ──
    const { data: order, error: orderError } = await supabase
      .from('crm_orders')
      .insert({
        order_number: orderNumber,
        source: body.source || 'shine_beauty_crm',
        salon_name: body.salon_name || null,
        contact_phone: body.contact_phone || null,
        contact_email: body.contact_email || null,
        items: orderItems,
        subtotal,
        status: 'pending',
        notes: body.notes || null,
        delivery_method: body.delivery_method || null,
      })
      .select('id, order_number, status, subtotal, created_at')
      .single();

    if (orderError || !order) {
      console.error('[CRM API] Order insert error:', orderError);
      return crmJson({ error: 'Failed to create order' }, { status: 500 });
    }

    // Estimated delivery: +3 business days
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 4);

    return crmJson(
      {
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        total: subtotal,
        items_count: orderItems.length,
        estimated_delivery: estimatedDelivery.toISOString().split('T')[0],
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[CRM API] Order create error:', err);
    return crmJson(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
