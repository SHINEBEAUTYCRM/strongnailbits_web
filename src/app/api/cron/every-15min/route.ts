// ================================================================
//  Cron: кожні 15 хвилин
//  Приклади задач: оновлення фідів маркетплейсів, abandoned carts
// ================================================================

import { NextResponse } from 'next/server';
import { runCronJobs, verifyCronSecret } from '@/lib/integrations/cron-runner';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await runCronJobs('*/15 * * * *', 'every-15min');
  return NextResponse.json({ schedule: 'every-15min', results });
}
