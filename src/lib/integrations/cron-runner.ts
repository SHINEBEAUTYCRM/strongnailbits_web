// ================================================================
//  ShineShop OS — Cron Runner
//  Центральний виконавець запланованих задач
// ================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { getDefaultTenantId } from '@/lib/integrations/base';
import type { CronJobRow } from '@/lib/integrations/types';

export interface CronRunResult {
  jobSlug: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  durationMs: number;
}

/**
 * Виконати всі активні cron jobs для заданого розкладу.
 *
 * @param schedule - Cron-розклад (e.g. '* /15 * * * *', '0 6 * * *')
 * @param scheduleLabel - Людська назва (e.g. 'every-15min', 'daily-morning')
 */
export async function runCronJobs(
  schedule: string,
  scheduleLabel: string
): Promise<CronRunResult[]> {
  const tenantId = await getDefaultTenantId();
  const supabase = createAdminClient();
  const results: CronRunResult[] = [];

  // Отримати активні jobs для цього розкладу
  const { data: jobs, error } = await supabase
    .from('cron_jobs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .eq('schedule', schedule);

  if (error || !jobs || jobs.length === 0) {
    return [{
      jobSlug: scheduleLabel,
      status: 'skipped',
      message: jobs?.length === 0
        ? `No active jobs for schedule "${schedule}"`
        : error?.message || 'Failed to fetch cron jobs',
      durationMs: 0,
    }];
  }

  // Виконати кожен job
  for (const job of jobs as CronJobRow[]) {
    const startTime = Date.now();

    try {
      // Виконати API Route
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      const response = await fetch(`${baseUrl}${job.api_route}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': process.env.CRON_SECRET || '',
        },
        body: JSON.stringify({ cronJobId: job.id, tenantId }),
      });

      const duration = Date.now() - startTime;

      // Оновити статус job
      await supabase
        .from('cron_jobs')
        .update({
          last_run_at: new Date().toISOString(),
          last_status: response.ok ? 'success' : 'error',
          last_duration_ms: duration,
          run_count: (job.run_count || 0) + 1,
          error_count: response.ok
            ? job.error_count
            : (job.error_count || 0) + 1,
        })
        .eq('id', job.id);

      results.push({
        jobSlug: job.slug,
        status: response.ok ? 'success' : 'error',
        message: response.ok
          ? `Completed in ${duration}ms`
          : `HTTP ${response.status}: ${response.statusText}`,
        durationMs: duration,
      });

      // Записати лог
      await supabase.from('integration_logs').insert({
        tenant_id: tenantId,
        service_slug: `cron:${job.slug}`,
        action: 'cron-run',
        status: response.ok ? 'success' : 'error',
        message: response.ok
          ? `Cron job "${job.name}" completed`
          : `Cron job "${job.name}" failed: HTTP ${response.status}`,
        metadata: { schedule, duration_ms: duration, api_route: job.api_route },
        duration_ms: duration,
      });
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      await supabase
        .from('cron_jobs')
        .update({
          last_run_at: new Date().toISOString(),
          last_status: 'error',
          last_duration_ms: duration,
          error_count: (job.error_count || 0) + 1,
        })
        .eq('id', job.id);

      results.push({
        jobSlug: job.slug,
        status: 'error',
        message: errorMessage,
        durationMs: duration,
      });
    }
  }

  return results;
}

/**
 * Перевірити CRON_SECRET для автентифікації Vercel Cron.
 */
export function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // В dev-режимі без секрету

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  const cronSecret = request.headers.get('x-cron-secret');
  return cronSecret === secret;
}
