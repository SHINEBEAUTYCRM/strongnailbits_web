// ================================================================
//  ShineShop OS — API Validators
//  Валідація вхідних даних для /api/v1/*
// ================================================================

import type {
  ProductUpsertInput,
  StockUpdateInput,
  CustomerUpsertInput,
  DocumentInput,
  BonusInput,
  PriceInput,
} from './types';

interface ValidationError {
  field: string;
  message: string;
}

// ────────────────────────────────────────────────────────
//  UUID Validator
// ────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

// ────────────────────────────────────────────────────────
//  Products
// ────────────────────────────────────────────────────────

export function validateProductUpsert(item: ProductUpsertInput, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `[${index}]`;

  if (!item.external_id) {
    errors.push({ field: `${prefix}.external_id`, message: 'required' });
  } else if (!isUUID(item.external_id)) {
    errors.push({ field: `${prefix}.external_id`, message: 'must be a valid UUID' });
  }

  if (!item.sku) {
    errors.push({ field: `${prefix}.sku`, message: 'required' });
  } else if (item.sku.length > 100) {
    errors.push({ field: `${prefix}.sku`, message: 'max 100 characters' });
  }

  if (!item.name) {
    errors.push({ field: `${prefix}.name`, message: 'required' });
  } else if (item.name.length > 500) {
    errors.push({ field: `${prefix}.name`, message: 'max 500 characters' });
  }

  if (item.price_retail === undefined || item.price_retail === null) {
    errors.push({ field: `${prefix}.price_retail`, message: 'required' });
  } else if (typeof item.price_retail !== 'number' || item.price_retail <= 0) {
    errors.push({ field: `${prefix}.price_retail`, message: 'must be > 0' });
  }

  if (item.stock_qty === undefined || item.stock_qty === null) {
    errors.push({ field: `${prefix}.stock_qty`, message: 'required' });
  } else if (typeof item.stock_qty !== 'number' || item.stock_qty < 0) {
    errors.push({ field: `${prefix}.stock_qty`, message: 'must be >= 0' });
  }

  if (item.brand && item.brand.length > 200) {
    errors.push({ field: `${prefix}.brand`, message: 'max 200 characters' });
  }

  if (item.barcode && !/^\d{8,14}$/.test(item.barcode)) {
    errors.push({ field: `${prefix}.barcode`, message: 'must be 8-14 digits' });
  }

  return errors;
}

export function validateStockUpdate(item: StockUpdateInput, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `[${index}]`;

  if (!item.external_id) {
    errors.push({ field: `${prefix}.external_id`, message: 'required' });
  }

  if (item.stock_qty === undefined || item.stock_qty === null) {
    errors.push({ field: `${prefix}.stock_qty`, message: 'required' });
  } else if (typeof item.stock_qty !== 'number' || item.stock_qty < 0) {
    errors.push({ field: `${prefix}.stock_qty`, message: 'must be >= 0' });
  }

  return errors;
}

// ────────────────────────────────────────────────────────
//  Customers
// ────────────────────────────────────────────────────────

const PHONE_REGEX = /^\+380\d{9}$/;
const LOYALTY_TIERS = ['bronze', 'silver', 'gold', 'platinum'];

export function validateCustomerUpsert(item: CustomerUpsertInput, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `[${index}]`;

  if (!item.external_id) {
    errors.push({ field: `${prefix}.external_id`, message: 'required' });
  } else if (!isUUID(item.external_id)) {
    errors.push({ field: `${prefix}.external_id`, message: 'must be a valid UUID' });
  }

  if (!item.name) {
    errors.push({ field: `${prefix}.name`, message: 'required' });
  } else if (item.name.length > 300) {
    errors.push({ field: `${prefix}.name`, message: 'max 300 characters' });
  }

  if (item.phone && !PHONE_REGEX.test(item.phone)) {
    errors.push({ field: `${prefix}.phone`, message: 'format: +380XXXXXXXXX' });
  }

  if (item.loyalty_tier && !LOYALTY_TIERS.includes(item.loyalty_tier)) {
    errors.push({ field: `${prefix}.loyalty_tier`, message: `must be one of: ${LOYALTY_TIERS.join(', ')}` });
  }

  if (item.credit_limit !== undefined && (typeof item.credit_limit !== 'number' || item.credit_limit < 0)) {
    errors.push({ field: `${prefix}.credit_limit`, message: 'must be >= 0' });
  }

  if (item.balance !== undefined && typeof item.balance !== 'number') {
    errors.push({ field: `${prefix}.balance`, message: 'must be a number' });
  }

  return errors;
}

// ────────────────────────────────────────────────────────
//  Documents
// ────────────────────────────────────────────────────────

const DOC_TYPES = ['sale', 'return', 'invoice'];

export function validateDocument(item: DocumentInput, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `[${index}]`;

  if (!item.external_id) {
    errors.push({ field: `${prefix}.external_id`, message: 'required' });
  }

  if (!item.customer_external_id) {
    errors.push({ field: `${prefix}.customer_external_id`, message: 'required' });
  }

  if (!item.doc_type || !DOC_TYPES.includes(item.doc_type)) {
    errors.push({ field: `${prefix}.doc_type`, message: `must be one of: ${DOC_TYPES.join(', ')}` });
  }

  if (!item.doc_number) {
    errors.push({ field: `${prefix}.doc_number`, message: 'required' });
  }

  if (!item.doc_date) {
    errors.push({ field: `${prefix}.doc_date`, message: 'required' });
  }

  if (item.total_amount === undefined || typeof item.total_amount !== 'number') {
    errors.push({ field: `${prefix}.total_amount`, message: 'required, must be a number' });
  }

  if (!item.items || !Array.isArray(item.items) || item.items.length === 0) {
    errors.push({ field: `${prefix}.items`, message: 'required, must be a non-empty array' });
  }

  return errors;
}

// ────────────────────────────────────────────────────────
//  Bonuses
// ────────────────────────────────────────────────────────

const BONUS_TYPES = ['accrual', 'redemption'];

export function validateBonus(item: BonusInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!item.customer_external_id) {
    errors.push({ field: 'customer_external_id', message: 'required' });
  }

  if (!item.type || !BONUS_TYPES.includes(item.type)) {
    errors.push({ field: 'type', message: `must be one of: ${BONUS_TYPES.join(', ')}` });
  }

  if (item.amount === undefined || typeof item.amount !== 'number' || item.amount <= 0) {
    errors.push({ field: 'amount', message: 'must be > 0' });
  }

  return errors;
}

// ────────────────────────────────────────────────────────
//  Prices
// ────────────────────────────────────────────────────────

export function validatePrice(item: PriceInput, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `[${index}]`;

  if (!item.customer_external_id) {
    errors.push({ field: `${prefix}.customer_external_id`, message: 'required' });
  }

  if (!item.product_external_id) {
    errors.push({ field: `${prefix}.product_external_id`, message: 'required' });
  }

  if (item.price === undefined || typeof item.price !== 'number' || item.price <= 0) {
    errors.push({ field: `${prefix}.price`, message: 'must be > 0' });
  }

  return errors;
}

// ────────────────────────────────────────────────────────
//  Generic array validator
// ────────────────────────────────────────────────────────

export function validateArray<T>(
  body: unknown,
  maxItems: number,
  label: string
): { items: T[] | null; error: string | null } {
  if (!body || !Array.isArray(body)) {
    return { items: null, error: `Request body must be a JSON array of ${label}` };
  }

  if (body.length === 0) {
    return { items: null, error: `Array must contain at least one ${label}` };
  }

  if (body.length > maxItems) {
    return { items: null, error: `Maximum ${maxItems} ${label} per request` };
  }

  return { items: body as T[], error: null };
}
