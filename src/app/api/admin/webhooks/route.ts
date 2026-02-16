// ================================================================
//  Admin API: /api/admin/webhooks
//  CRUD для вебхуків
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDefaultTenantId } from '@/lib/integrations/base';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { generateWebhookSecret } from '@/lib/api/webhooks';

export const dynamic = 'force-dynamic';

// ─── GET — Список вебхуків ───
export async function GET() {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const tenantId = await getDefaultTenantId();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('webhooks')
      .select('id, name, url, events, is_active, retry_count, timeout_ms, last_status, last_error, last_fired_at, success_count, error_count, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ webhooks: data || [] });
  } catch (err) {
    console.error('[Webhooks GET]', err);
    return NextResponse.json({ error: 'Не вдалося завантажити вебхуки' }, { status: 500 });
  }
}

// ─── POST — Створити вебхук ───
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const tenantId = await getDefaultTenantId();
    const supabase = createAdminClient();
    const body = await req.json();

    const { name, url, events, retry_count = 3, timeout_ms = 10000, headers = {} } = body;

    if (!name || !url || !events || events.length === 0) {
      return NextResponse.json({ error: 'name, url, events обов\'язкові' }, { status: 400 });
    }

    // Validate URL
    try { new URL(url); } catch (err) {
      console.error('[API:Webhooks] Invalid URL:', err);
      return NextResponse.json({ error: 'Невалідний URL' }, { status: 400 });
    }

    const secret = generateWebhookSecret();

    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        tenant_id: tenantId,
        name,
        url,
        secret,
        events,
        retry_count: Math.min(Math.max(retry_count, 1), 5),
        timeout_ms: Math.min(Math.max(timeout_ms, 3000), 30000),
        headers,
      })
      .select('id, name, url, secret, events, is_active, retry_count, timeout_ms, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({
      webhook: data,
      message: 'Вебхук створено. Збережіть secret — він показується лише один раз.',
    });
  } catch (err) {
    console.error('[Webhooks POST]', err);
    return NextResponse.json({ error: 'Не вдалося створити вебхук' }, { status: 500 });
  }
}

// ─── PATCH — Оновити вебхук ───
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const tenantId = await getDefaultTenantId();
    const supabase = createAdminClient();
    const body = await req.json();

    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id обов\'язковий' }, { status: 400 });

    // Don't allow changing secret via patch
    delete updates.secret;
    delete updates.tenant_id;

    if (updates.url) {
      try { new URL(updates.url); } catch (err) {
        console.error('[API:Webhooks] Invalid URL on update:', err);
        return NextResponse.json({ error: 'Невалідний URL' }, { status: 400 });
      }
    }

    const { error } = await supabase
      .from('webhooks')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Webhooks PATCH]', err);
    return NextResponse.json({ error: 'Не вдалося оновити' }, { status: 500 });
  }
}

// ─── DELETE — Видалити вебхук ───
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const tenantId = await getDefaultTenantId();
    const supabase = createAdminClient();
    const { id } = await req.json();

    if (!id) return NextResponse.json({ error: 'id обов\'язковий' }, { status: 400 });

    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Webhooks DELETE]', err);
    return NextResponse.json({ error: 'Не вдалося видалити' }, { status: 500 });
  }
}
