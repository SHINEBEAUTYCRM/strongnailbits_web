// ================================================================
//  API: /api/integrations/events
//  GET — список подій (outbox + inbox) з фільтрами
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDefaultTenantId } from '@/lib/integrations/base';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getDefaultTenantId();
    const supabase = createAdminClient();
    const { searchParams } = request.nextUrl;

    const direction = searchParams.get('direction') || 'outbox';
    const status = searchParams.get('status');
    const topic = searchParams.get('topic');
    const slug = searchParams.get('slug');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (direction === 'inbox') {
      let query = supabase
        .from('event_inbox')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('received_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);
      if (topic) query = query.eq('topic', topic);
      if (slug) query = query.eq('provider_slug', slug);

      const { data, count, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: data || [], total: count || 0, direction: 'inbox' });
    }

    // Default: outbox
    let query = supabase
      .from('event_outbox')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (topic) query = query.eq('topic', topic);
    if (slug) query = query.eq('target_slug', slug);

    const { data, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [], total: count || 0, direction: 'outbox' });
  } catch (err) {
    console.error('[API:Events] GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
