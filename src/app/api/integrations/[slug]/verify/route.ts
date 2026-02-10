// ================================================================
//  API: /api/integrations/[slug]/verify
//  Верифікація з'єднання для будь-якого сервісу
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceBySlug } from '@/lib/integrations/registry';
import { SimpleKeyIntegration } from '@/lib/integrations/base';

/**
 * POST /api/integrations/[slug]/verify
 * Перевіряє з'єднання з сервісом наданими ключами.
 *
 * Body: { config: Record<string, string> }
 * Response: { success: boolean, message: string, details?: any }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { config } = body as { config: Record<string, string> };

    if (!config) {
      return NextResponse.json(
        { error: 'config is required' },
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

    // Визначити обов'язкові поля
    const requiredKeys = service.requiredFields
      .filter(f => f.required)
      .map(f => f.key);

    // Базова верифікація: перевірка обов'язкових полів
    // У майбутньому — кожен сервіс матиме свій verify() з реальним API-запитом
    const integration = new SimpleKeyIntegration(slug, requiredKeys);
    const result = await integration.verifyAndSave(config);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Verification failed',
      },
      { status: 500 }
    );
  }
}
