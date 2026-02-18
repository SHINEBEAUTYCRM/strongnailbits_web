// ================================================================
//  API: /api/integrations/health
//  GET — здоров'я всіх підключених інтеграцій
//  POST — запустити health check для конкретного сервісу
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAllHealthStatuses, updateHealthStatus } from '@/lib/integrations/event-bus';
import { getServiceField } from '@/lib/integrations/config-resolver';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const statuses = await getAllHealthStatuses();
    return NextResponse.json({ data: statuses });
  } catch (err) {
    console.error('[API:Health] GET error:', err);
    // If tables don't exist yet, return empty
    return NextResponse.json({ data: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json();
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    const startMs = Date.now();
    let status: 'healthy' | 'degraded' | 'down' = 'down';
    let errorMsg: string | undefined;
    let extra: Record<string, unknown> = {};

    try {
      switch (slug) {
        case 'nova-poshta': {
          const apiKey = await getServiceField('nova-poshta', 'api_key');
          if (!apiKey) { errorMsg = 'API key not configured'; break; }
          const res = await fetch('https://api.novaposhta.ua/v2.0/json/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey,
              modelName: 'Common',
              calledMethod: 'getTimeList',
            }),
          });
          const json = await res.json();
          status = json.success ? 'healthy' : 'degraded';
          if (!json.success) errorMsg = json.errors?.[0] || 'API returned error';
          break;
        }

        case 'telegram-bot': {
          const botToken = await getServiceField('telegram-bot', 'bot_token');
          if (!botToken) { errorMsg = 'Bot token not configured'; break; }
          const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
          const json = await res.json();
          status = json.ok ? 'healthy' : 'down';
          if (json.ok) extra = { username: json.result?.username };
          else errorMsg = json.description || 'getMe failed';
          break;
        }

        case 'claude-api': {
          const apiKey = await getServiceField('claude-api', 'api_key');
          if (!apiKey) { errorMsg = 'API key not configured'; break; }
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-3-5-haiku-latest',
              max_tokens: 10,
              messages: [{ role: 'user', content: 'ping' }],
            }),
          });
          status = res.ok ? 'healthy' : (res.status === 429 ? 'degraded' : 'down');
          if (!res.ok) {
            const errBody = await res.text();
            errorMsg = `HTTP ${res.status}: ${errBody.slice(0, 200)}`;
          }
          break;
        }

        default: {
          // Passive check: перевірити що ключі є і is_active=true
          const field = await getServiceField(slug, 'api_key').catch(() => null);
          const altField = await getServiceField(slug, 'bot_token').catch(() => null);
          const altField2 = await getServiceField(slug, 'public_key').catch(() => null);
          if (field || altField || altField2) {
            status = 'healthy';
            extra = { check_type: 'passive', note: 'Keys present' };
          } else {
            status = 'down';
            errorMsg = 'No configuration found';
            extra = { check_type: 'passive' };
          }
        }
      }
    } catch (checkErr) {
      status = 'down';
      errorMsg = checkErr instanceof Error ? checkErr.message : 'Unknown error';
    }

    const durationMs = Date.now() - startMs;

    await updateHealthStatus(slug, status, {
      responseTimeMs: durationMs,
      error: errorMsg,
      extra,
    });

    return NextResponse.json({
      slug,
      status,
      responseTimeMs: durationMs,
      error: errorMsg || null,
      details: extra,
    });
  } catch (err) {
    console.error('[API:Health] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
