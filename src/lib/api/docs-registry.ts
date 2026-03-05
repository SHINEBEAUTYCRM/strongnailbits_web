// ================================================================
//  StrongNailBits OS — API Documentation Registry
//  Повний опис всіх ендпоінтів для інтерактивної документації
// ================================================================

export interface DocField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface DocEndpoint {
  id: string;
  group: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  permission: string;
  summary: string;
  description: string;
  direction: '1С → Сайт' | 'Сайт → 1С' | 'Двонапрямковий';
  requestFields?: DocField[];
  responseExample: Record<string, unknown>;
  requestExample?: unknown;
  queryParams?: DocField[];
  pathParams?: DocField[];
  notes?: string;
}

export interface DocGroup {
  id: string;
  label: string;
  icon: string;
  endpoints: DocEndpoint[];
}

// ─── Helper ───
function suc(data: unknown, meta?: unknown) {
  const r: Record<string, unknown> = { success: true, data };
  if (meta) r.meta = meta;
  return r;
}

// ================================================================
//  GROUPS
// ================================================================

export const API_DOCS: DocGroup[] = [
  // ────────────────────────────────────────────────────────────
  // Health
  // ────────────────────────────────────────────────────────────
  {
    id: 'health',
    label: 'Підключення',
    icon: 'Heart',
    endpoints: [
      {
        id: 'health-check',
        group: 'health',
        method: 'GET',
        path: '/api/v1/health',
        permission: '(будь-який токен)',
        summary: 'Перевірка підключення',
        description: 'Перевірити, що токен валідний, і побачити свої permissions та rate limit.',
        direction: 'Двонапрямковий',
        responseExample: suc({
          status: 'ok',
          token_name: '1С Обмін',
          permissions: ['products:write', 'orders:read'],
          rate_limit: 100,
          rate_remaining: 95,
          server_time: '2026-02-10T14:00:00Z',
        }),
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Products
  // ────────────────────────────────────────────────────────────
  {
    id: 'products',
    label: 'Товари',
    icon: 'Package',
    endpoints: [
      {
        id: 'products-upsert',
        group: 'products',
        method: 'POST',
        path: '/api/v1/products',
        permission: 'products:write',
        summary: 'Upsert товарів',
        description: 'Створення нових або оновлення існуючих товарів (upsert по external_id). До 500 за один запит.',
        direction: '1С → Сайт',
        requestFields: [
          { name: 'external_id', type: 'string (UUID)', required: true, description: 'UUID товару з 1С' },
          { name: 'sku', type: 'string', required: true, description: 'Артикул, 1-100 символів' },
          { name: 'name', type: 'string', required: true, description: 'Назва, 1-500 символів' },
          { name: 'price_retail', type: 'number', required: true, description: 'Роздрібна ціна, > 0' },
          { name: 'stock_qty', type: 'integer', required: true, description: 'Залишок, >= 0' },
          { name: 'barcode', type: 'string', required: false, description: 'Штрихкод, 8-14 цифр' },
          { name: 'brand', type: 'string', required: false, description: 'Бренд, до 200 символів' },
          { name: 'category_path', type: 'string', required: false, description: 'Шлях категорії' },
          { name: 'price_wholesale', type: 'number', required: false, description: 'Оптова ціна' },
          { name: 'unit', type: 'string', required: false, description: 'Одиниця виміру (шт)' },
          { name: 'weight_g', type: 'integer', required: false, description: 'Вага в грамах' },
          { name: 'is_active', type: 'boolean', required: false, description: 'Активний (true)' },
        ],
        requestExample: [
          {
            external_id: 'e8b5a51d-1234-4abc-9def-567890abcdef',
            sku: 'DA-BASE-10',
            name: 'База DARK 10мл',
            brand: 'DARK',
            price_retail: 289.00,
            price_wholesale: 231.00,
            stock_qty: 143,
          },
        ],
        responseExample: suc({ created: 3, updated: 47, errors: [] }),
      },
      {
        id: 'products-stock',
        group: 'products',
        method: 'PATCH',
        path: '/api/v1/products/stock',
        permission: 'products:write',
        summary: 'Оновлення залишків',
        description: 'Швидке оновлення тільки залишків (без інших полів). До 500 позицій за один запит.',
        direction: '1С → Сайт',
        requestFields: [
          { name: 'external_id', type: 'string (UUID)', required: true, description: 'UUID товару з 1С' },
          { name: 'stock_qty', type: 'integer', required: true, description: 'Новий залишок, >= 0' },
        ],
        requestExample: [
          { external_id: 'e8b5a51d-1234-4abc-9def-567890abcdef', stock_qty: 143 },
          { external_id: 'a1b2c3d4-5678-9abc-def0-123456789abc', stock_qty: 0 },
        ],
        responseExample: suc({ updated: 2 }),
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Customers
  // ────────────────────────────────────────────────────────────
  {
    id: 'customers',
    label: 'Клієнти',
    icon: 'Users',
    endpoints: [
      {
        id: 'customers-upsert',
        group: 'customers',
        method: 'POST',
        path: '/api/v1/customers',
        permission: 'customers:write',
        summary: 'Upsert контрагентів',
        description: 'Створення або оновлення контрагентів (upsert по external_id). До 500 за один запит.',
        direction: '1С → Сайт',
        requestFields: [
          { name: 'external_id', type: 'string (UUID)', required: true, description: 'UUID контрагента з 1С' },
          { name: 'name', type: 'string', required: true, description: 'ПІБ, 1-300 символів' },
          { name: 'phone', type: 'string', required: false, description: '+380XXXXXXXXX' },
          { name: 'email', type: 'string', required: false, description: 'Email' },
          { name: 'company_name', type: 'string', required: false, description: 'Назва компанії' },
          { name: 'company_code', type: 'string', required: false, description: 'ЄДРПОУ' },
          { name: 'is_b2b', type: 'boolean', required: false, description: 'B2B-клієнт (false)' },
          { name: 'discount_percent', type: 'number', required: false, description: '% знижки' },
          { name: 'credit_limit', type: 'number', required: false, description: 'Кредитний ліміт' },
          { name: 'payment_terms_days', type: 'integer', required: false, description: 'Термін оплати (днів)' },
          { name: 'balance', type: 'number', required: false, description: "Баланс (від'ємне = борг)" },
          { name: 'total_purchased', type: 'number', required: false, description: 'Загальна сума покупок' },
          { name: 'loyalty_tier', type: 'string', required: false, description: 'bronze|silver|gold|platinum' },
          { name: 'loyalty_points', type: 'number', required: false, description: 'Бонусні бали' },
          { name: 'manager_name', type: 'string', required: false, description: "Ім'я менеджера" },
        ],
        requestExample: [
          {
            external_id: 'c1d2e3f4-5678-9abc-def0-111111111111',
            name: 'Олена Іваненко',
            phone: '+380671234567',
            is_b2b: true,
            discount_percent: 10,
            balance: -15000.00,
            loyalty_tier: 'gold',
          },
        ],
        responseExample: suc({ created: 2, updated: 15, errors: [] }),
      },
      {
        id: 'customers-new',
        group: 'customers',
        method: 'GET',
        path: '/api/v1/customers/new',
        permission: 'customers:read',
        summary: 'Нові клієнти з сайту',
        description: 'Клієнти, які зареєструвались на сайті і ще не синхронізовані з 1С.',
        direction: 'Сайт → 1С',
        queryParams: [
          { name: 'page', type: 'integer', required: false, description: 'Сторінка (1)' },
          { name: 'per_page', type: 'integer', required: false, description: 'Записів на сторінку (50, макс 500)' },
        ],
        responseExample: suc(
          [{ id: 'uuid', name: 'Нова Клієнтка', phone: '+380991234567', email: 'new@gmail.com', is_b2b: true, created_at: '2026-02-10T14:00:00Z' }],
          { total: 5, page: 1, per_page: 50, total_pages: 1 },
        ),
      },
      {
        id: 'customers-synced',
        group: 'customers',
        method: 'PATCH',
        path: '/api/v1/customers/{id}/synced',
        permission: 'customers:write',
        summary: 'Позначити клієнта синхронізованим',
        description: 'Після створення контрагента в 1С, прив\'язати UUID з 1С до запису на сайті.',
        direction: '1С → Сайт',
        pathParams: [
          { name: 'id', type: 'string (UUID)', required: true, description: 'ID клієнта на сайті' },
        ],
        requestFields: [
          { name: 'external_id', type: 'string (UUID)', required: true, description: 'UUID контрагента в 1С' },
        ],
        requestExample: { external_id: 'uuid-контрагента-з-1с' },
        responseExample: suc({ id: 'uuid-з-сайту', external_id: 'uuid-контрагента-з-1с', synced: true }),
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Orders
  // ────────────────────────────────────────────────────────────
  {
    id: 'orders',
    label: 'Замовлення',
    icon: 'ShoppingBag',
    endpoints: [
      {
        id: 'orders-new',
        group: 'orders',
        method: 'GET',
        path: '/api/v1/orders/new',
        permission: 'orders:read',
        summary: 'Нові замовлення',
        description: 'Замовлення, які ще не забрані 1С (synced_at IS NULL).',
        direction: 'Сайт → 1С',
        queryParams: [
          { name: 'page', type: 'integer', required: false, description: 'Сторінка (1)' },
          { name: 'per_page', type: 'integer', required: false, description: 'Записів (50)' },
          { name: 'status', type: 'string', required: false, description: 'Фільтр: new|processing|shipped|delivered|cancelled' },
          { name: 'updated_after', type: 'string (ISO 8601)', required: false, description: 'Фільтр по даті' },
        ],
        responseExample: suc(
          [{
            id: 'uuid-замовлення',
            order_number: 'SHINE-ABC123',
            created_at: '2026-02-10T14:30:00Z',
            customer_external_id: 'uuid-клієнта-з-1с',
            customer_phone: '+380671234567',
            customer_name: 'Олена Іваненко',
            delivery_type: 'np_warehouse',
            delivery_address: 'Одеса, Відділення №15',
            payment_method: 'liqpay',
            payment_status: 'paid',
            total_amount: 12450.00,
            items: [{ product_external_id: 'uuid', sku: 'DA-BASE-10', name: 'База DARK 10мл', quantity: 30, price: 231.00, total: 6930.00 }],
          }],
          { total: 3, page: 1, per_page: 50, total_pages: 1 },
        ),
      },
      {
        id: 'orders-synced',
        group: 'orders',
        method: 'PATCH',
        path: '/api/v1/orders/{id}/synced',
        permission: 'orders:write',
        summary: 'Позначити замовлення синхронізованим',
        description: '1С повідомляє, що замовлення оброблено та передає свій UUID.',
        direction: '1С → Сайт',
        pathParams: [{ name: 'id', type: 'string (UUID)', required: true, description: 'ID замовлення на сайті' }],
        requestFields: [{ name: 'external_id', type: 'string (UUID)', required: true, description: 'UUID замовлення в 1С' }],
        requestExample: { external_id: 'uuid-замовлення-в-1с' },
        responseExample: suc({ id: 'uuid', external_id: 'uuid-замовлення-в-1с', synced: true }),
      },
      {
        id: 'orders-status',
        group: 'orders',
        method: 'PATCH',
        path: '/api/v1/orders/{id}/status',
        permission: 'orders:write',
        summary: 'Оновити статус замовлення',
        description: 'Оновити статус, ТТН, дату відправки, статус оплати.',
        direction: '1С → Сайт',
        pathParams: [{ name: 'id', type: 'string (UUID)', required: true, description: 'ID замовлення' }],
        requestFields: [
          { name: 'status', type: 'string', required: false, description: 'new|processing|shipped|delivered|cancelled' },
          { name: 'ttn_number', type: 'string', required: false, description: 'Номер ТТН' },
          { name: 'shipped_at', type: 'string (ISO 8601)', required: false, description: 'Дата відправки' },
          { name: 'payment_status', type: 'string', required: false, description: 'pending|paid|failed' },
        ],
        requestExample: { status: 'shipped', ttn_number: '20450000123456', payment_status: 'paid' },
        responseExample: suc({ id: 'uuid', status: 'shipped', ttn_number: '20450000123456', payment_status: 'paid' }),
        notes: 'Хоча б одне поле обов\'язкове.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Documents
  // ────────────────────────────────────────────────────────────
  {
    id: 'documents',
    label: 'Документи',
    icon: 'FileText',
    endpoints: [
      {
        id: 'documents-create',
        group: 'documents',
        method: 'POST',
        path: '/api/v1/documents',
        permission: 'documents:write',
        summary: 'Завантажити накладні',
        description: 'Завантажити реалізації, повернення, рахунки з 1С. До 100 за один запит.',
        direction: '1С → Сайт',
        requestFields: [
          { name: 'external_id', type: 'string (UUID)', required: true, description: 'UUID документа з 1С' },
          { name: 'customer_external_id', type: 'string (UUID)', required: true, description: 'UUID клієнта з 1С' },
          { name: 'doc_type', type: 'string', required: true, description: 'sale|return|invoice' },
          { name: 'doc_number', type: 'string', required: true, description: 'Номер документа' },
          { name: 'doc_date', type: 'string (YYYY-MM-DD)', required: true, description: 'Дата документа' },
          { name: 'total_amount', type: 'number', required: true, description: 'Загальна сума' },
          { name: 'items', type: 'array', required: true, description: 'Масив рядків документа' },
          { name: 'discount_amount', type: 'number', required: false, description: 'Сума знижки' },
          { name: 'payment_status', type: 'string', required: false, description: 'pending|paid|partial|failed' },
          { name: 'ttn_number', type: 'string', required: false, description: 'Номер ТТН' },
        ],
        requestExample: [{
          external_id: 'uuid-документа',
          customer_external_id: 'uuid-клієнта',
          doc_type: 'sale',
          doc_number: 'РН-000234',
          doc_date: '2026-02-10',
          total_amount: 12450.00,
          items: [{ product_external_id: 'uuid', product_name: 'База DARK 10мл', quantity: 30, price: 231.00, total: 6930.00 }],
        }],
        responseExample: suc({ created: 1, updated: 0, errors: [] }),
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Payments
  // ────────────────────────────────────────────────────────────
  {
    id: 'payments',
    label: 'Оплати',
    icon: 'CreditCard',
    endpoints: [
      {
        id: 'payments-new',
        group: 'payments',
        method: 'GET',
        path: '/api/v1/payments/new',
        permission: 'payments:read',
        summary: 'Нові оплати',
        description: 'Оплати зі статусом success, які ще не забрані 1С.',
        direction: 'Сайт → 1С',
        queryParams: [
          { name: 'page', type: 'integer', required: false, description: 'Сторінка (1)' },
          { name: 'per_page', type: 'integer', required: false, description: 'Записів (50)' },
        ],
        responseExample: suc(
          [{ id: 'uuid', order_id: 'uuid', amount: 12450.00, method: 'liqpay', transaction_id: 'LP-123456', paid_at: '2026-02-10T14:35:00Z', status: 'success' }],
          { total: 2, page: 1, per_page: 50, total_pages: 1 },
        ),
      },
      {
        id: 'payments-synced',
        group: 'payments',
        method: 'PATCH',
        path: '/api/v1/payments/new',
        permission: 'payments:write',
        summary: 'Позначити оплати синхронізованими',
        description: 'Передати масив ID оплат, які 1С обробив.',
        direction: '1С → Сайт',
        requestFields: [
          { name: 'ids', type: 'string[]', required: true, description: 'Масив UUID оплат' },
        ],
        requestExample: { ids: ['uuid-1', 'uuid-2'] },
        responseExample: suc({ updated: 2 }),
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Bonuses
  // ────────────────────────────────────────────────────────────
  {
    id: 'bonuses',
    label: 'Бонуси',
    icon: 'Gift',
    endpoints: [
      {
        id: 'bonuses-new',
        group: 'bonuses',
        method: 'GET',
        path: '/api/v1/bonuses/new',
        permission: 'bonuses:read',
        summary: 'Нові бонусні операції з сайту',
        description: 'Бонусні операції (наприклад, списання при оформленні замовлення), які ще не забрані 1С.',
        direction: 'Сайт → 1С',
        queryParams: [
          { name: 'page', type: 'integer', required: false, description: 'Сторінка (1)' },
          { name: 'per_page', type: 'integer', required: false, description: 'Записів (50)' },
        ],
        responseExample: suc(
          [{ id: 'uuid', customer_external_id: 'uuid', order_id: 'uuid', type: 'redemption', amount: 500.00, reason: 'purchase', created_at: '2026-02-10T14:30:00Z' }],
        ),
      },
      {
        id: 'bonuses-synced',
        group: 'bonuses',
        method: 'PATCH',
        path: '/api/v1/bonuses/new',
        permission: 'bonuses:write',
        summary: 'Позначити бонуси синхронізованими',
        description: 'Передати масив ID бонусних операцій, які 1С обробив.',
        direction: '1С → Сайт',
        requestFields: [
          { name: 'ids', type: 'string[]', required: true, description: 'Масив UUID операцій' },
        ],
        requestExample: { ids: ['uuid-1', 'uuid-2'] },
        responseExample: suc({ updated: 2 }),
      },
      {
        id: 'bonuses-create',
        group: 'bonuses',
        method: 'POST',
        path: '/api/v1/bonuses',
        permission: 'bonuses:write',
        summary: 'Нарахувати / списати бонуси',
        description: 'Нарахувати або списати бонуси з 1С (день народження, ручне нарахування і т.д.). До 100 за один запит.',
        direction: '1С → Сайт',
        requestFields: [
          { name: 'customer_external_id', type: 'string (UUID)', required: true, description: 'UUID клієнта з 1С' },
          { name: 'type', type: 'string', required: true, description: 'accrual (нарахування) | redemption (списання)' },
          { name: 'amount', type: 'number', required: true, description: 'Сума, > 0' },
          { name: 'reason', type: 'string', required: false, description: 'Причина: birthday, manual, purchase' },
          { name: 'order_id', type: 'string', required: false, description: 'UUID замовлення (якщо пов\'язано)' },
        ],
        requestExample: { customer_external_id: 'uuid', type: 'accrual', amount: 500.00, reason: 'birthday' },
        responseExample: suc({ created: 1, errors: [] }),
      },
    ],
  },

  // ────────────────────────────────────────────────────────────
  // Prices
  // ────────────────────────────────────────────────────────────
  {
    id: 'prices',
    label: 'Ціни B2B',
    icon: 'DollarSign',
    endpoints: [
      {
        id: 'prices-upsert',
        group: 'prices',
        method: 'POST',
        path: '/api/v1/prices',
        permission: 'prices:write',
        summary: 'Індивідуальні B2B ціни',
        description: 'Завантажити персональні ціни для B2B клієнтів. До 1000 за один запит.',
        direction: '1С → Сайт',
        requestFields: [
          { name: 'customer_external_id', type: 'string (UUID)', required: true, description: 'UUID клієнта з 1С' },
          { name: 'product_external_id', type: 'string (UUID)', required: true, description: 'UUID товару з 1С' },
          { name: 'price', type: 'number', required: true, description: 'Індивідуальна ціна, > 0' },
        ],
        requestExample: [
          { customer_external_id: 'uuid-клієнта', product_external_id: 'uuid-товару', price: 195.00 },
        ],
        responseExample: suc({ created: 5, updated: 12, errors: [] }),
      },
    ],
  },
];

/** Flat list of all endpoints */
export const ALL_ENDPOINTS: DocEndpoint[] = API_DOCS.flatMap(g => g.endpoints);

/** Status codes reference */
export const STATUS_CODES = [
  { code: 200, label: 'OK', description: 'Запит успішний', color: 'emerald' },
  { code: 400, label: 'Bad Request', description: 'Помилка валідації даних', color: 'amber' },
  { code: 401, label: 'Unauthorized', description: 'Невірний або відсутній токен', color: 'red' },
  { code: 403, label: 'Forbidden', description: 'Немає прав на цей ендпоінт', color: 'red' },
  { code: 404, label: 'Not Found', description: 'Ресурс не знайдено', color: 'amber' },
  { code: 429, label: 'Too Many Requests', description: 'Перевищено ліміт запитів', color: 'amber' },
  { code: 500, label: 'Server Error', description: 'Помилка на стороні сервера', color: 'red' },
];
