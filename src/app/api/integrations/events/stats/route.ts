// ================================================================
//  API: /api/integrations/events/stats
//  GET — статистика подій для дашборду
// ================================================================

import { NextResponse } from 'next/server';
import { getEventStats } from '@/lib/integrations/event-bus';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getEventStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error('[API:EventStats] GET error:', err);
    // Return empty stats if tables don't exist yet
    return NextResponse.json({
      outbox: { pending: 0, failed: 0, sent: 0, dead: 0 },
      inbox: { received: 0, processed: 0, failed: 0 },
      deliveries: { total: 0, success: 0, failed: 0, avgDurationMs: 0 },
    });
  }
}
