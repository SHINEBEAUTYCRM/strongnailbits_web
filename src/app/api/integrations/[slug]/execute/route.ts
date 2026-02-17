// ================================================================
//  API: /api/integrations/[slug]/execute
//  Виконання дії для конкретного сервісу
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceBySlug } from '@/lib/integrations/registry';

/**
 * POST /api/integrations/[slug]/execute
 * Виконати дію для сервісу.
 *
 * Body: { action: string, params?: Record<string, any> }
 *
 * Поки що — заглушка. Кожен сервіс буде реалізовувати свої дії
 * у відповідному файлі /lib/integrations/[category]/[service].ts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { action, params: actionParams } = body as {
      action: string;
      params?: Record<string, unknown>;
    };

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    // Перевірити чи сервіс існує
    const service = getServiceBySlug(slug);
    if (!service) {
      return NextResponse.json(
        { error: `Service "${slug}" not found in registry` },
        { status: 404 }
      );
    }

    // TODO: Диспетчеризація до конкретної реалізації сервісу
    // Буде реалізовано при впровадженні кожного сервісу
    return NextResponse.json({
      message: `Action "${action}" for "${slug}" is not yet implemented`,
      slug,
      action,
      params: actionParams,
    }, { status: 501 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Execution failed' },
      { status: 500 }
    );
  }
}
