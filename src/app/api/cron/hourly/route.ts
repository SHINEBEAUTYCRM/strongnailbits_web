// ================================================================
//  Cron: щогодини
//  Приклади задач: перевірка конкурентів, оптимізація реклами
// ================================================================

import { NextResponse } from 'next/server';
import { runCronJobs, verifyCronSecret } from '@/lib/integrations/cron-runner';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await runCronJobs('0 * * * *', 'hourly');
  return NextResponse.json({ schedule: 'hourly', results });
}
