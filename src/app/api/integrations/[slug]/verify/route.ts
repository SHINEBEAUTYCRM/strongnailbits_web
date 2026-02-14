// ================================================================
//  API: /api/integrations/[slug]/verify
//  Верифікація з'єднання для будь-якого сервісу
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceBySlug } from '@/lib/integrations/registry';
import { SimpleKeyIntegration } from '@/lib/integrations/base';
import { invalidateServiceCache } from '@/lib/integrations/config-resolver';

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

    // ── Telegram Bot: перевірка токена через getMe ──
    if (slug === 'telegram-bot' && config.bot_token) {
      try {
        const tgRes = await fetch(
          `https://api.telegram.org/bot${config.bot_token}/getMe`,
          { signal: AbortSignal.timeout(10000) }
        );
        const tgData = await tgRes.json();

        if (!tgData.ok) {
          const integration = new SimpleKeyIntegration(slug, requiredKeys);
          await integration.verifyAndSave(config);
          return NextResponse.json({
            success: false,
            message: `Telegram: невірний токен бота`,
          });
        }

        // Save config
        const integration = new SimpleKeyIntegration(slug, requiredKeys);
        await integration.verifyAndSave(config);
        invalidateServiceCache(slug);

        // Send test message if chat_id provided
        if (config.chat_id) {
          try {
            await fetch(
              `https://api.telegram.org/bot${config.bot_token}/sendMessage`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: config.chat_id,
                  text: '✅ ShineShop бот підключено! Сповіщення будуть надходити в цей чат.',
                  parse_mode: 'HTML',
                }),
                signal: AbortSignal.timeout(10000),
              }
            );
          } catch (err) {
            console.error('[API:Integrations:Verify] Telegram chat test failed:', err);
            return NextResponse.json({
              success: false,
              message: `Бот @${tgData.result.username} знайдено, але Chat ID невірний. Напишіть боту і спробуйте ще раз.`,
            });
          }
        }

        return NextResponse.json({
          success: true,
          message: `Telegram бот @${tgData.result.username} підключено!${config.chat_id ? ' Тестове повідомлення відправлено.' : ' Додайте Chat ID для сповіщень.'}`,
          details: { botUsername: tgData.result.username },
        });
      } catch (err) {
        return NextResponse.json({
          success: false,
          message: `Telegram: помилка з'єднання — ${err instanceof Error ? err.message : 'timeout'}`,
        });
      }
    }

    // ── AlphaSMS: реальна перевірка балансу через API ──
    if (slug === 'alphasms' && config.api_key) {
      try {
        const alphaRes = await fetch(
          `https://alphasms.net/api/http.php?version=http&key=${encodeURIComponent(config.api_key)}&command=balance`,
          { signal: AbortSignal.timeout(10000) }
        );
        const text = await alphaRes.text();
        const trimmed = text.trim();

        if (trimmed.includes('Wrong login') || trimmed.includes('error')) {
          // Key is invalid, still save but mark as failed
          const integration = new SimpleKeyIntegration(slug, requiredKeys);
          await integration.verifyAndSave(config); // save config anyway
          return NextResponse.json({
            success: false,
            message: `AlphaSMS: невірний API ключ (${trimmed})`,
          });
        }

        const balanceMatch = trimmed.match(/balance:([\d.\-]+)/i);
        const balance = balanceMatch ? parseFloat(balanceMatch[1]) : null;

        // Save verified config
        const integration = new SimpleKeyIntegration(slug, requiredKeys);
        await integration.verifyAndSave(config);
        invalidateServiceCache(slug);

        return NextResponse.json({
          success: true,
          message: `AlphaSMS підключено! Баланс: ${balance !== null ? balance.toFixed(2) + ' грн' : 'OK'}`,
          details: { balance },
        });
      } catch (err) {
        return NextResponse.json({
          success: false,
          message: `AlphaSMS: помилка з'єднання — ${err instanceof Error ? err.message : 'timeout'}`,
        });
      }
    }

    // ── Базова верифікація для інших сервісів ──
    const integration = new SimpleKeyIntegration(slug, requiredKeys);
    const result = await integration.verifyAndSave(config);

    // Invalidate cached config after verify & save
    invalidateServiceCache(slug);

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
