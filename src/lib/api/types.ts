// ================================================================
//  ShineShop OS — API Types
// ================================================================

export interface ApiTokenRow {
  id: string;
  tenant_id: string;
  name: string;
  token_hash: string;
  permissions: string[];
  rate_limit: number;
  ip_whitelist: string[] | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface ApiAuthContext {
  token: ApiTokenRow;
  tenantId: string;
}

export interface ApiContext {
  tokenId: string;
  tenantId: string;
  tokenName: string;
  permissions: string[];
}

/** Вхідні дані для upsert товарів (пошук по SKU) */
export interface ProductUpsertInput {
  external_id?: string;
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

/** Вхідні дані для оновлення залишків (пошук по SKU) */
export interface StockUpdateInput {
  external_id?: string;
  sku: string;
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

export interface BonusInput {
  customer_external_id: string;
  type: 'accrual' | 'redemption';
  amount: number;
  reason?: string;
  order_id?: string;
}

export interface PriceInput {
  customer_external_id: string;
  product_external_id: string;
  price: number;
}
