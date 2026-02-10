// ================================================================
//  ShineShop OS — Base Integration Class
//  Абстрактний клас для всіх 47 сервісів
// ================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { decryptConfig, encryptConfig } from './crypto';
import type { VerifyResult, IntegrationKeyRow } from './types';

// Кеш tenant_id щоб не читати з БД кожен раз
let _defaultTenantId: string | null = null;

/**
 * Отримати ID тенанта за замовчуванням (Shine Shop).
 * Кешується в пам'яті на рівні серверного рантайму.
 */
export async function getDefaultTenantId(): Promise<string> {
  if (_defaultTenantId) return _defaultTenantId;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('tenant_settings')
    .select('id')
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error('Tenant not found. Run schema-integrations.sql first.');
  }

  _defaultTenantId = data.id as string;
  return _defaultTenantId!;
}

/**
 * BaseIntegration — абстрактний клас.
 * Кожен із 47 сервісів наслідує його.
 *
 * Забезпечує:
 * - Читання/запис зашифрованих API-ключів
 * - Перевірку активності сервісу
 * - Логування всіх дій
 * - Шаблон для верифікації з'єднання
 */
export abstract class BaseIntegration {
  protected slug: string;
  protected tenantId: string;

  constructor(slug: string, tenantId?: string) {
    this.slug = slug;
    this.tenantId = tenantId || '';
  }

  /**
   * Ініціалізувати з default tenant (для Shine Shop)
   */
  async init(): Promise<void> {
    if (!this.tenantId) {
      this.tenantId = await getDefaultTenantId();
    }
  }

  // -----------------------------------------------------------------
  //  Конфігурація (API-ключі)
  // -----------------------------------------------------------------

  /**
   * Отримати розшифровану конфігурацію з БД
   */
  async getConfig(): Promise<Record<string, string> | null> {
    await this.init();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('integration_keys')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('service_slug', this.slug)
      .single();

    if (error || !data) return null;

    const row = data as IntegrationKeyRow;
    if (!row.is_active) return null;

    return decryptConfig(row.config);
  }

  /**
   * Зберегти конфігурацію (зашифровану) в БД
   */
  async saveConfig(config: Record<string, string>): Promise<void> {
    await this.init();
    const supabase = createAdminClient();
    const encrypted = await encryptConfig(config);

    await supabase
      .from('integration_keys')
      .upsert(
        {
          tenant_id: this.tenantId,
          service_slug: this.slug,
          config: encrypted,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,service_slug' }
      );
  }

  // -----------------------------------------------------------------
  //  Статус
  // -----------------------------------------------------------------

  /**
   * Перевірити чи сервіс активний і має валідні ключі
   */
  async isActive(): Promise<boolean> {
    await this.init();
    const supabase = createAdminClient();

    const { data } = await supabase
      .from('integration_keys')
      .select('is_active, is_verified')
      .eq('tenant_id', this.tenantId)
      .eq('service_slug', this.slug)
      .single();

    return !!(data?.is_active && data?.is_verified);
  }

  /**
   * Отримати повний рядок з БД
   */
  async getKeyRow(): Promise<IntegrationKeyRow | null> {
    await this.init();
    const supabase = createAdminClient();

    const { data } = await supabase
      .from('integration_keys')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('service_slug', this.slug)
      .single();

    return (data as IntegrationKeyRow) || null;
  }

  // -----------------------------------------------------------------
  //  Верифікація (абстрактний метод)
  // -----------------------------------------------------------------

  /**
   * Перевірити з'єднання з наданими ключами.
   * Кожен сервіс реалізує свою логіку.
   */
  abstract verify(config: Record<string, string>): Promise<VerifyResult>;

  /**
   * Верифікувати і зберегти результат у БД
   */
  async verifyAndSave(config: Record<string, string>): Promise<VerifyResult> {
    await this.init();
    const startTime = Date.now();

    let result: VerifyResult;
    try {
      result = await this.verify(config);
    } catch (err) {
      result = {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error during verification',
      };
    }

    const duration = Date.now() - startTime;
    const supabase = createAdminClient();
    const encrypted = await encryptConfig(config);

    // Оновити статус верифікації
    await supabase
      .from('integration_keys')
      .upsert(
        {
          tenant_id: this.tenantId,
          service_slug: this.slug,
          config: encrypted,
          is_active: true,
          is_verified: result.success,
          verified_at: result.success ? new Date().toISOString() : null,
          error_message: result.success ? null : result.message,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,service_slug' }
      );

    // Записати лог
    await this.log(
      'verify',
      result.success ? 'success' : 'error',
      result.message,
      { duration_ms: duration, ...result.details }
    );

    return result;
  }

  // -----------------------------------------------------------------
  //  Логування
  // -----------------------------------------------------------------

  /**
   * Записати лог дії в БД
   */
  protected async log(
    action: string,
    status: 'success' | 'error' | 'warning' | 'info',
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.init();
      const supabase = createAdminClient();

      await supabase.from('integration_logs').insert({
        tenant_id: this.tenantId,
        service_slug: this.slug,
        action,
        status,
        message,
        metadata: metadata || {},
        duration_ms: (metadata?.duration_ms as number) || null,
      });
    } catch {
      // Логування не повинно ламати основну логіку
      console.error(`[IntegrationLog] Failed to log: ${this.slug}/${action}`);
    }
  }
}

// ================================================================
//  Фабрика інтеграцій
// ================================================================

/**
 * Простий verify для сервісів, які не потребують API-перевірки
 * (вбудовані функції, безкоштовні без ключів)
 */
export class BuiltinIntegration extends BaseIntegration {
  async verify(_config: Record<string, string>): Promise<VerifyResult> {
    return { success: true, message: 'Вбудована функція — завжди активна.' };
  }
}

/**
 * Verify для сервісів, де потрібно перевірити лише наявність ключів
 * (без реального API-запиту)
 */
export class SimpleKeyIntegration extends BaseIntegration {
  private requiredKeys: string[];

  constructor(slug: string, requiredKeys: string[], tenantId?: string) {
    super(slug, tenantId);
    this.requiredKeys = requiredKeys;
  }

  async verify(config: Record<string, string>): Promise<VerifyResult> {
    const missing = this.requiredKeys.filter(k => !config[k]);
    if (missing.length > 0) {
      return {
        success: false,
        message: `Відсутні обов'язкові поля: ${missing.join(', ')}`,
      };
    }
    return { success: true, message: 'Ключі збережено.' };
  }
}
