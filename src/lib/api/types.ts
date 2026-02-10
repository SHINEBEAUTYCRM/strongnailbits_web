// ================================================================
//  ShineShop OS — API Types
//  Типи для REST API інтеграції з 1С
// ================================================================

/** Контекст авторизованого API-запиту */
export interface ApiContext {
  tokenId: string;
  tenantId: string;
  tokenName: string;
  permissions: string[];
}

/** Стандартна успішна відповідь */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
    total_pages?: number;
  };
}

/** Стандартна відповідь з помилкою */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

/** Всі можливі permission */
export type ApiPermission =
  | 'products:read'
  | 'products:write'
  | 'customers:read'
  | 'customers:write'
  | 'orders:read'
  | 'orders:write'
  | 'documents:write'
  | 'payments:read'
  | 'payments:write'
  | 'bonuses:read'
  | 'bonuses:write'
  | 'prices:write';

/** Перелік всіх permissions з описами */
export const API_PERMISSIONS: Record<ApiPermission, { method: string; description: string }> = {
  'products:read':   { method: 'GET',        description: 'Читання каталогу' },
  'products:write':  { method: 'POST/PATCH', description: 'Створення/оновлення товарів, цін, залишків' },
  'customers:read':  { method: 'GET',        description: 'Читання клієнтів' },
  'customers:write': { method: 'POST/PATCH', description: 'Створення/оновлення контрагентів, балансів' },
  'orders:read':     { method: 'GET',        description: 'Забрати нові замовлення з сайту' },
  'orders:write':    { method: 'PATCH',      description: 'Оновити статус, ТТН, позначити synced' },
  'documents:write': { method: 'POST',       description: 'Завантажити накладні/реалізації' },
  'payments:read':   { method: 'GET',        description: 'Забрати нові оплати' },
  'payments:write':  { method: 'PATCH',      description: 'Позначити оплату оброблено' },
  'bonuses:read':    { method: 'GET',        description: 'Забрати бонусні операції' },
  'bonuses:write':   { method: 'POST/PATCH', description: 'Нарахувати/списати бонуси' },
  'prices:write':    { method: 'POST',       description: 'Індивідуальні B2B ціни' },
};

/** Дані рядка api_tokens з БД */
export interface ApiTokenRow {
  id: string;
  tenant_id: string;
  name: string;
  token_hash: string;
  token_prefix: string;
  permissions: string[];
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Вхідні дані для upsert товарів */
export interface ProductUpsertInput {
  external_id: string;
  sku: string;
  barcode?: string;
  name: string;
  brand?: string;
  category_path?: string;
  price_retail: number;
  price_wholesale?: number;
  stock_qty: number;
  unit?: string;
  weight_g?: number;
  is_active?: boolean;
}

/** Вхідні дані для оновлення залишків */
export interface StockUpdateInput {
  external_id: string;
  stock_qty: number;
}

/** Вхідні дані для upsert клієнтів */
export interface CustomerUpsertInput {
  external_id: string;
  name: string;
  company_name?: string;
  company_code?: string;
  phone?: string;
  email?: string;
  is_b2b?: boolean;
  discount_percent?: number;
  credit_limit?: number;
  payment_terms_days?: number;
  balance?: number;
  total_purchased?: number;
  loyalty_tier?: string;
  loyalty_points?: number;
  manager_name?: string;
}

/** Вхідні дані документа */
export interface DocumentInput {
  external_id: string;
  customer_external_id: string;
  doc_type: 'sale' | 'return' | 'invoice';
  doc_number: string;
  doc_date: string;
  total_amount: number;
  discount_amount?: number;
  payment_status?: string;
  ttn_number?: string;
  items: Array<{
    product_external_id: string;
    product_name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

/** Вхідні дані бонусної операції */
export interface BonusInput {
  customer_external_id: string;
  type: 'accrual' | 'redemption';
  amount: number;
  reason?: string;
  order_id?: string;
}

/** Вхідні дані індивідуальної ціни */
export interface PriceInput {
  customer_external_id: string;
  product_external_id: string;
  price: number;
}
