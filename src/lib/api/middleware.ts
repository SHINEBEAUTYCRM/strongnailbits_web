// ================================================================
//  ShineShop OS — API Auth Middleware
//  Авторизація через Bearer-токен для /api/v1/*
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from './rate-limiter';
import {
  apiUnauthorized,
  apiForbidden,
  apiRateLimit,
  apiServerError,
  truncateBody,
  getClientIP,
  hashToken,
} from './helpers';
import type { ApiContext, ApiTokenRow } from './types';

const SENSITIVE_KEYS = new Set([
  'password', 'tempPassword', 'verificationToken',
  'token', 'secret', 'apiKey', 'api_key',
]);
const PII_KEYS = new Set(['phone', 'email']);

function maskPII(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(maskPII);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = '[REDACTED]';
    } else if (PII_KEYS.has(k) && typeof v === 'string' && v.length > 4) {
      out[k] = v.slice(0, 3) + '***' + v.slice(-2);
    } else if (typeof v === 'object') {
      out[k] = maskPII(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Записати лог API-запиту
 */
async function logApiRequest(params: {
  tokenId: string | null;
  tenantId: string | null;
  method: string;
  endpoint: string;
  statusCode: number;
  requestBody: unknown;
  responseTimeMs: number;
  errorMessage: string | null;
  ipAddress: string;
}) {
  try {
    const supabase = createAdminClient();
    await supabase.from('api_request_log').insert({
      token_id: params.tokenId,
      tenant_id: params.tenantId,
      method: params.method,
      endpoint: params.endpoint,
      status_code: params.statusCode,
      request_body: truncateBody(maskPII(params.requestBody)),
      response_time_ms: params.responseTimeMs,
      error_message: params.errorMessage,
      ip_address: params.ipAddress,
    });
  } catch (err) {
    // Логування не повинно ламати основну логіку
    console.error('[API Log] Failed to write:', err);
  }
}

/**
 * Обгортка для API-маршрутів з авторизацією через Bearer-токен.
 *
 * Перевіряє:
 * 1. Наявність та валідність токена
 * 2. Чи токен не прострочений
 * 3. Rate limit
 * 4. Permissions
 * 5. Логування запиту
 *
 * Використання:
 * ```ts
 * export const POST = withApiAuth('products:write', async (req, ctx) => {
 *   // ctx.tenantId, ctx.tokenId, ctx.permissions
 *   return apiSuccess({ created: 5 });
 * });
 * ```
 */
export function withApiAuth(
  requiredPermission: string,
  handler: (req: NextRequest, ctx: ApiContext) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const method = req.method;
    const endpoint = new URL(req.url).pathname;
    const ipAddress = getClientIP(req.headers);

    let tokenId: string | null = null;
    let tenantId: string | null = null;
    let requestBody: unknown = null;

    try {
      // ── 1. Витягти токен з Authorization header ──
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const resp = apiUnauthorized('Missing API token');
        await logApiRequest({
          tokenId, tenantId, method, endpoint,
          statusCode: 401, requestBody: null,
          responseTimeMs: Date.now() - startTime,
          errorMessage: 'Missing API token', ipAddress,
        });
        return resp;
      }

      const token = authHeader.slice(7).trim();
      if (!token) {
        const resp = apiUnauthorized('Empty API token');
        await logApiRequest({
          tokenId, tenantId, method, endpoint,
          statusCode: 401, requestBody: null,
          responseTimeMs: Date.now() - startTime,
          errorMessage: 'Empty API token', ipAddress,
        });
        return resp;
      }

      // ── 2. Знайти токен в БД ──
      const tokenHash = await hashToken(token);
      const supabase = createAdminClient();

      const { data: tokenRow, error: tokenError } = await supabase
        .from('api_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .eq('is_active', true)
        .single();

      if (tokenError || !tokenRow) {
        const resp = apiUnauthorized('Invalid API token');
        await logApiRequest({
          tokenId, tenantId, method, endpoint,
          statusCode: 401, requestBody: null,
          responseTimeMs: Date.now() - startTime,
          errorMessage: 'Invalid API token', ipAddress,
        });
        return resp;
      }

      const row = tokenRow as ApiTokenRow;
      tokenId = row.id;
      tenantId = row.tenant_id;

      // ── 3. Перевірити термін дії ──
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        const resp = apiUnauthorized('Token expired');
        await logApiRequest({
          tokenId, tenantId, method, endpoint,
          statusCode: 401, requestBody: null,
          responseTimeMs: Date.now() - startTime,
          errorMessage: 'Token expired', ipAddress,
        });
        return resp;
      }

      // ── 4. Rate limit ──
      const rateCheck = checkRateLimit(row.id, row.rate_limit);
      if (!rateCheck.allowed) {
        const resp = apiRateLimit(
          `Rate limit exceeded. Limit: ${row.rate_limit}/min. Retry after ${Math.ceil((rateCheck.resetAt - Date.now()) / 1000)}s`
        );
        resp.headers.set('Retry-After', String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)));
        resp.headers.set('X-RateLimit-Limit', String(row.rate_limit));
        resp.headers.set('X-RateLimit-Remaining', '0');

        await logApiRequest({
          tokenId, tenantId, method, endpoint,
          statusCode: 429, requestBody: null,
          responseTimeMs: Date.now() - startTime,
          errorMessage: 'Rate limit exceeded', ipAddress,
        });
        return resp;
      }

      // ── 4b. IP Whitelist ──
      const allowedIps = (row.allowed_ips || []) as string[];
      if (allowedIps.length > 0 && !allowedIps.includes(ipAddress)) {
        const resp = apiForbidden(
          `IP address ${ipAddress} is not in the whitelist for this token`
        );
        await logApiRequest({
          tokenId, tenantId, method, endpoint,
          statusCode: 403, requestBody: null,
          responseTimeMs: Date.now() - startTime,
          errorMessage: `IP ${ipAddress} not whitelisted`, ipAddress,
        });
        return resp;
      }

      // ── 5. Перевірити permissions ──
      const permissions = (row.permissions || []) as string[];
      if (!permissions.includes(requiredPermission)) {
        const resp = apiForbidden(
          `Insufficient permissions. Required: "${requiredPermission}". Token has: [${permissions.join(', ')}]`
        );
        await logApiRequest({
          tokenId, tenantId, method, endpoint,
          statusCode: 403, requestBody: null,
          responseTimeMs: Date.now() - startTime,
          errorMessage: `Missing permission: ${requiredPermission}`, ipAddress,
        });
        return resp;
      }

      // ── 6. Оновити last_used_at (non-blocking) ──
      supabase
        .from('api_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', row.id)
        .then(() => {});

      // ── 7. Побудувати контекст і викликати handler ──
      const ctx: ApiContext = {
        tokenId: row.id,
        tenantId: row.tenant_id,
        tokenName: row.name,
        permissions,
      };

      // Спробувати отримати body для логування (тільки для POST/PATCH/PUT)
      if (['POST', 'PATCH', 'PUT'].includes(method)) {
        try {
          requestBody = await req.clone().json();
        } catch (err) {
          console.error('[API:Middleware] Body parse failed:', err);
        }
      }

      const response = await handler(req, ctx);
      const statusCode = response.status;

      // ── 8. Rate limit headers ──
      response.headers.set('X-RateLimit-Limit', String(row.rate_limit));
      response.headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));

      // ── 9. Логування ──
      await logApiRequest({
        tokenId, tenantId, method, endpoint,
        statusCode, requestBody,
        responseTimeMs: Date.now() - startTime,
        errorMessage: statusCode >= 400 ? `HTTP ${statusCode}` : null,
        ipAddress,
      });

      return response;
    } catch (err) {
      console.error('[API Middleware] Error:', err);

      const resp = apiServerError(
        err instanceof Error ? err.message : 'Internal server error'
      );

      await logApiRequest({
        tokenId, tenantId, method, endpoint,
        statusCode: 500, requestBody,
        responseTimeMs: Date.now() - startTime,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        ipAddress,
      });

      return resp;
    }
  };
}

/**
 * Генерація нового API-токена.
 * Повертає { token, tokenHash, tokenPrefix }.
 * token показується користувачу ОДИН РАЗ.
 */
export async function generateApiToken(): Promise<{
  token: string;
  tokenHash: string;
  tokenPrefix: string;
}> {
  // Генеруємо 32 випадкових байти
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const token = `sk_live_${hex}`;

  const tokenHash = await hashToken(token);
  const tokenPrefix = token.slice(0, 12);

  return { token, tokenHash, tokenPrefix };
}
