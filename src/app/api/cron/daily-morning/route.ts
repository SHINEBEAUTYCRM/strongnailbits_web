// ================================================================
//  Cron: щодня о 06:00 UTC
//  Приклади задач: парсинг цін, курси валют, reorder reminders
// ================================================================

import { NextResponse } from 'next/server';
import { runCronJobs, verifyCronSecret } from '@/lib/integrations/cron-runner';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await runCronJobs('0 6 * * *', 'daily-morning');
  return NextResponse.json({ schedule: 'daily-morning', results });
}
