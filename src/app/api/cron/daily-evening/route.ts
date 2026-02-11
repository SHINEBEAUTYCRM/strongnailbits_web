// ================================================================
//  Cron: щодня о 18:00 UTC (21:00 Київ)
//  Задачі: щоденний звіт у Telegram, SEO-контент, birthday emails
// ================================================================

import { NextResponse } from 'next/server';
import { runCronJobs, verifyCronSecret } from '@/lib/integrations/cron-runner';
import { sendDailyReport } from '@/lib/telegram/daily-report';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run registered cron jobs
  const results = await runCronJobs('0 18 * * *', 'daily-evening');

  // Send Telegram daily report
  const reportResult = await sendDailyReport();

  return NextResponse.json({
    schedule: 'daily-evening',
    results,
    telegramReport: reportResult,
  });
}
