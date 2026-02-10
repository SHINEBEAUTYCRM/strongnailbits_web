// ================================================================
//  API: /api/integrations/keys
//  CRUD для API-ключів інтеграцій
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDefaultTenantId } from '@/lib/integrations/base';
import { encryptConfig, decryptConfig, maskValue } from '@/lib/integrations/crypto';
import { getServiceBySlug } from '@/lib/integrations/registry';
import type { IntegrationKeyRow } from '@/lib/integrations/types';

/**
 * GET /api/integrations/keys
 * Отримати всі ключі інтеграцій (замасковані)
 */
export async function GET() {
  try {
    const tenantId = await getDefaultTenantId();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('integration_keys')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('service_slug');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Маскуємо значення ключів
    const masked = (data as IntegrationKeyRow[]).map(row => ({
      ...row,
      config: Object.fromEntries(
        Object.entries(row.config).map(([k, v]) => [k, maskValue(v)])
      ),
    }));

    return NextResponse.json({ data: masked });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/integrations/keys
 * Оновити/створити ключі для сервісу
 * Body: { slug: string, config: Record<string, string> }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, config } = body as {
      slug: string;
      config: Record<string, string>;
    };

    if (!slug || !config) {
      return NextResponse.json(
        { error: 'slug and config are required' },
        { status: 400 }
      );
    }

    // Перевірити чи сервіс існує в реєстрі
    const service = getServiceBySlug(slug);
    if (!service) {
      return NextResponse.json(
        { error: `Service "${slug}" not found in registry` },
        { status: 404 }
      );
    }

    const tenantId = await getDefaultTenantId();
    const supabase = createAdminClient();

    // Зашифрувати конфігурацію
    const encrypted = await encryptConfig(config);

    const { data, error } = await supabase
      .from('integration_keys')
      .upsert(
        {
          tenant_id: tenantId,
          service_slug: slug,
          config: encrypted,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,service_slug' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, message: 'Ключі збережено' });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/keys
 * Видалити ключі сервісу (деактивувати)
 * Body: { slug: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug } = body as { slug: string };

    if (!slug) {
      return NextResponse.json(
        { error: 'slug is required' },
        { status: 400 }
      );
    }

    const tenantId = await getDefaultTenantId();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('integration_keys')
      .update({
        is_active: false,
        is_verified: false,
        config: {},
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('service_slug', slug);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: `Інтеграцію "${slug}" деактивовано` });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
