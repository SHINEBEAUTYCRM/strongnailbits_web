// ================================================================
//  Admin API: /api/admin/api-tokens
//  CRUD для API-токенів (створення, список, деактивація, видалення)
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDefaultTenantId } from '@/lib/integrations/base';
import { generateApiToken } from '@/lib/api/middleware';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

// ────────────────────────────────────────────────────────
//  GET — Список всіх токенів
// ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const tenantId = await getDefaultTenantId();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('api_tokens')
      .select('id, name, token_prefix, permissions, rate_limit, is_active, last_used_at, expires_at, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Додати статистику запитів для кожного токена
    const enriched = await Promise.all(
      (data || []).map(async (token) => {
        // Кількість запитів за останні 24 години
        const { count: requestCount24h } = await supabase
          .from('api_request_log')
          .select('*', { count: 'exact', head: true })
          .eq('token_id', token.id)
          .gte('created_at', new Date(Date.now() - 86400000).toISOString());

        // Кількість помилок за останні 24 години
        const { count: errorCount24h } = await supabase
          .from('api_request_log')
          .select('*', { count: 'exact', head: true })
          .eq('token_id', token.id)
          .gte('status_code', 400)
          .gte('created_at', new Date(Date.now() - 86400000).toISOString());

        return {
          ...token,
          stats: {
            requests_24h: requestCount24h || 0,
            errors_24h: errorCount24h || 0,
          },
        };
      })
    );

    return NextResponse.json({ data: enriched });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────
//  POST — Створити новий токен
// ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const body = await request.json();
    const { name, permissions, rate_limit, expires_in_days } = body as {
      name: string;
      permissions: string[];
      rate_limit?: number;
      expires_in_days?: number | null;
    };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json({ error: 'At least one permission is required' }, { status: 400 });
    }

    const tenantId = await getDefaultTenantId();
    const supabase = createAdminClient();

    // Генерувати токен
    const { token, tokenHash, tokenPrefix } = await generateApiToken();

    // Визначити expires_at
    let expiresAt: string | null = null;
    if (expires_in_days && expires_in_days > 0) {
      const d = new Date();
      d.setDate(d.getDate() + expires_in_days);
      expiresAt = d.toISOString();
    }

    // Зберегти в БД
    const { data, error } = await supabase
      .from('api_tokens')
      .insert({
        tenant_id: tenantId,
        name: name.trim(),
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        permissions,
        rate_limit: rate_limit || 100,
        is_active: true,
        expires_at: expiresAt,
      })
      .select('id, name, token_prefix, permissions, rate_limit, is_active, expires_at, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Повертаємо token ОДИН РАЗ
    return NextResponse.json({
      data: {
        ...data,
        token, // ← Тільки тут! Більше ніде не буде показано
      },
      message: 'Token created. Copy it now — it will not be shown again.',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────
//  PATCH — Оновити токен (деактивація, зміна rate limit)
// ────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const body = await request.json();
    const { id, is_active, rate_limit, name, permissions } = body as {
      id: string;
      is_active?: boolean;
      rate_limit?: number;
      name?: string;
      permissions?: string[];
    };

    if (!id) {
      return NextResponse.json({ error: 'Token id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (is_active !== undefined) update.is_active = is_active;
    if (rate_limit !== undefined) update.rate_limit = rate_limit;
    if (name !== undefined) update.name = name;
    if (permissions !== undefined) update.permissions = permissions;

    const { error } = await supabase
      .from('api_tokens')
      .update(update)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────
//  DELETE — Видалити токен
// ────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const body = await request.json();
    const { id } = body as { id: string };

    if (!id) {
      return NextResponse.json({ error: 'Token id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('api_tokens')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Token deleted' });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
