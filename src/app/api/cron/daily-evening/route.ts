// ================================================================
//  Cron: щодня о 18:00 UTC
//  Приклади задач: щоденні звіти, SEO-контент, birthday emails
// ================================================================

import { NextResponse } from 'next/server';
import { runCronJobs, verifyCronSecret } from '@/lib/integrations/cron-runner';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await runCronJobs('0 18 * * *', 'daily-evening');
  return NextResponse.json({ schedule: 'daily-evening', results });
}
