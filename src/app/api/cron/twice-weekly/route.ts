// ================================================================
//  Cron: двічі на тиждень (вт, пт о 12:00 UTC)
//  Приклади задач: виплати селлерам, SEO-аудит
// ================================================================

import { NextResponse } from 'next/server';
import { runCronJobs, verifyCronSecret } from '@/lib/integrations/cron-runner';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await runCronJobs('0 12 * * 2,5', 'twice-weekly');
  return NextResponse.json({ schedule: 'twice-weekly', results });
}
