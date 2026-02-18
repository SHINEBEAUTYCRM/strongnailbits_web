// ================================================================
//  API: /api/integrations/events/retry
//  POST — retry failed подій
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDefaultTenantId } from '@/lib/integrations/base';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getDefaultTenantId();
    const body = await request.json();
    const supabase = createAdminClient();

    // Single event retry
    if (body.eventId) {
      const { error } = await supabase
        .from('event_outbox')
        .update({
          status: 'pending',
          next_retry_at: new Date().toISOString(),
        })
        .eq('id', body.eventId)
        .eq('tenant_id', tenantId)
        .in('status', ['failed', 'dead']);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: 'Event queued for retry' });
    }

    // Bulk retry by topic + status
    if (body.topic) {
      let query = supabase
        .from('event_outbox')
        .update({
          status: 'pending',
          next_retry_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .eq('topic', body.topic);

      if (body.status) {
        query = query.eq('status', body.status);
      } else {
        query = query.in('status', ['failed', 'dead']);
      }

      const { error, count } = await query.select('id');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: `${count || 0} events queued for retry` });
    }

    return NextResponse.json({ error: 'eventId or topic required' }, { status: 400 });
  } catch (err) {
    console.error('[API:EventRetry] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
