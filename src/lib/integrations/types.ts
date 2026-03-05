// ================================================================
//  StrongNailBits OS — Integration Types
//  Типи для маркетингової екосистеми (47 сервісів)
// ================================================================

// -----------------------------------------------------------------
//  Категорії сервісів
// -----------------------------------------------------------------

export type ServiceCategory =
  | 'operations'      // Нова Пошта, LiqPay, Checkbox, TurboSMS, AlphaSMS
  | 'analytics'       // GA4, GTM, Clarity, PostHog, FB Pixel, Looker
  | 'seo'             // GSC, Serpstat, GBP
  | 'ads'             // Google Ads, FB/IG Ads, TikTok Ads
  | 'comms'           // eSputnik, OneSignal, Telegram
  | 'ai'              // Claude, PhotoRoom, FLUX, Banuba
  | 'marketplace-ext' // Prom, Rozetka, Hotline, Admitad
  | 'competitors'     // SearchApi, Apify, Meta Ad Library, Ahrefs, Price Parser
  | 'design'          // Polotno, Fabric.js
  | 'international'   // Przelewy24, Stripe, Meest, WhitePress
  | 'marketplace'     // Seller Portal, Moderation, Split Payment, etc.
  | 'builtin';        // Loyalty, UGC/Reviews

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  operations: 'Операційні (доставка, оплата, чеки, SMS)',
  analytics: 'Аналітика та трекінг',
  seo: 'SEO',
  ads: 'Рекламні платформи',
  comms: 'Комунікації',
  ai: 'AI та контент',
  'marketplace-ext': 'Маркетплейси зовнішні',
  competitors: 'Конкурентна розвідка',
  design: 'Дизайн',
  international: 'Міжнародна експансія',
  marketplace: 'Маркетплейс косметики',
  builtin: 'Вбудовані функції',
};

export const SERVICE_CATEGORY_ORDER: ServiceCategory[] = [
  'operations',
  'comms',
  'analytics',
  'seo',
  'ads',
  'ai',
  'competitors',
  'marketplace-ext',
  'design',
  'international',
  'marketplace',
  'builtin',
];

// -----------------------------------------------------------------
//  Поля конфігурації сервісу
// -----------------------------------------------------------------

export interface FieldDef {
  key: string;         // Ключ у JSONB config (e.g. 'api_key', 'pixel_id')
  label: string;       // UI label (e.g. 'API Key')
  type: 'text' | 'password' | 'url' | 'email' | 'number' | 'select';
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  options?: { value: string; label: string }[]; // для type='select'
}

// -----------------------------------------------------------------
//  Визначення сервісу (статичний реєстр)
// -----------------------------------------------------------------

export interface ServiceDefinition {
  slug: string;
  name: string;
  category: ServiceCategory;
  module: string;            // Назва модуля адмінки
  icon: string;              // Lucide icon name
  description: string;
  requiredFields: FieldDef[];
  isRequired: boolean;       // Рекомендовано для мінімального старту
  docsUrl?: string;
  envMapping?: Record<string, string>; // Map field key → env variable name
}

// -----------------------------------------------------------------
//  Результат верифікації з'єднання
// -----------------------------------------------------------------

export interface VerifyResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// -----------------------------------------------------------------
//  Статус інтеграції (з БД)
// -----------------------------------------------------------------

export interface IntegrationKeyRow {
  id: string;
  tenant_id: string;
  service_slug: string;
  config: Record<string, string>;
  is_active: boolean;
  is_verified: boolean;
  verified_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------
//  Лог інтеграції (з БД)
// -----------------------------------------------------------------

export interface IntegrationLogRow {
  id: string;
  tenant_id: string;
  service_slug: string;
  action: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string | null;
  metadata: Record<string, unknown>;
  duration_ms: number | null;
  created_at: string;
}

// -----------------------------------------------------------------
//  Cron Job (з БД)
// -----------------------------------------------------------------

export interface CronJobRow {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  description: string | null;
  schedule: string;
  api_route: string;
  is_active: boolean;
  last_run_at: string | null;
  last_status: string | null;
  last_duration_ms: number | null;
  next_run_at: string | null;
  run_count: number;
  error_count: number;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------
//  Automation Trigger (з БД)
// -----------------------------------------------------------------

export interface AutomationTriggerRow {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  description: string | null;
  table_name: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  conditions: Record<string, unknown>;
  action_route: string;
  is_active: boolean;
  last_fired_at: string | null;
  fire_count: number;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------
//  Tenant Settings (з БД)
// -----------------------------------------------------------------

export interface TenantSettingsRow {
  id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  theme: Record<string, unknown>;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------
//  API Response types
// -----------------------------------------------------------------

export interface IntegrationStatusItem {
  slug: string;
  name: string;
  category: ServiceCategory;
  isActive: boolean;
  isVerified: boolean;
  verifiedAt: string | null;
  errorMessage: string | null;
  hasConfig: boolean;
  source?: 'db' | 'env' | null;
}
