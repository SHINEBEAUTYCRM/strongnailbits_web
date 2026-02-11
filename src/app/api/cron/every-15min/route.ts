// ================================================================
//  Cron: кожні 15 хвилин
//  Задачі: відкладені повідомлення, abandoned carts, оновлення фідів
// ================================================================

import { NextResponse } from 'next/server';
import { runCronJobs, verifyCronSecret } from '@/lib/integrations/cron-runner';
import { processScheduledMessages } from '@/lib/messaging/funnel-actions';
import { updateShipmentStatuses } from '@/lib/novaposhta/tracking-cron';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Process scheduled funnel messages
  const messaging = await processScheduledMessages();

  // Update Nova Poshta shipment statuses
  const npTracking = await updateShipmentStatuses();

  // Run other registered cron jobs
  const results = await runCronJobs('*/15 * * * *', 'every-15min');

  return NextResponse.json({
    schedule: 'every-15min',
    messaging,
    npTracking,
    results,
  });
}
