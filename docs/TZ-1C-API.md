# ТЕХНІЧНЕ ЗАВДАННЯ ДЛЯ ПРОГРАМІСТА 1С

## API інтеграції з сайтом Shine Shop

**Версія:** 1.0  
**Дата:** Лютий 2026  
**Статус:** Готово до розробки — API реалізовано на стороні сайту

---

## 1. Загальна інформація

### Що вже зроблено на стороні сайту

- REST API на базовому URL: `https://shineshopb2b.com/api/v1/`
- Авторизація через Bearer-токен
- Валідація всіх вхідних даних
- Логування всіх запитів
- Rate limiting (обмеження частоти запитів)

### Що потрібно зробити в 1С

Написати обробку обміну, яка:

1. Вивантажує товари, залишки, ціни на сайт
2. Вивантажує контрагентів з балансами та бонусами
3. Забирає нові замовлення з сайту
4. Оновлює статуси замовлень та ТТН
5. Завантажує документи реалізації
6. Забирає оплати
7. Обмінюється бонусами
8. Завантажує індивідуальні B2B ціни

---

## 2. Авторизація

### Токен

Токен отримуєте від адміністратора сайту. Формат:

```
sk_live_a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
```

### Як використовувати

**Кожен** HTTP-запит повинен містити заголовок:

```
Authorization: Bearer sk_live_ваш_токен_тут
Content-Type: application/json
```

### Приклад на псевдокоді 1С

```
HTTPЗапит = Новий HTTPЗапит("/api/v1/products");
HTTPЗапит.Заголовки.Вставить("Authorization", "Bearer sk_live_ваш_токен");
HTTPЗапит.Заголовки.Вставить("Content-Type", "application/json");
```

### Коди помилок авторизації

| Код | Причина | Що робити |
|-----|---------|-----------|
| 401 | Немає заголовка Authorization | Додати заголовок |
| 401 | Невірний токен | Перевірити токен |
| 401 | Токен прострочений | Запросити новий токен |
| 403 | Немає прав на цей ендпоінт | Запросити токен з потрібними правами |
| 429 | Перевищено ліміт запитів | Почекати 60 секунд і повторити |

---

## 3. Формат відповідей

### Успіх (HTTP 200)

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 143,
    "page": 1,
    "per_page": 50,
    "total_pages": 3
  }
}
```

### Помилка (HTTP 400 / 401 / 403 / 404 / 429 / 500)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'sku' is required",
    "details": [
      { "field": "[0].sku", "message": "required" }
    ]
  }
}
```

**ВАЖЛИВО:** Завжди перевіряйте поле `success`. Якщо `false` — обробіть помилку та запишіть у лог.

---

## 4. Пагінація

Для GET-запитів, які повертають списки, підтримуються параметри:

```
?page=1&per_page=50
```

- `page` — номер сторінки (за замовчуванням 1)
- `per_page` — записів на сторінку (за замовчуванням 50, максимум 500)

Відповідь містить `meta` з інформацією для навігації по сторінках.

---

## 5. Ендпоінти

### Базовий URL

```
https://shineshopb2b.com/api/v1/
```

---

### 5.1. Товари — POST /api/v1/products

**Напрямок:** 1С → Сайт  
**Що робить:** Створює нові товари або оновлює існуючі (upsert по `external_id`)  
**Ліміт:** до 500 товарів за один запит

**Запит:**

```
POST /api/v1/products
Authorization: Bearer sk_live_xxx
Content-Type: application/json
```

**Тіло запиту (JSON масив):**

```json
[
  {
    "external_id": "e8b5a51d-1234-4abc-9def-567890abcdef",
    "sku": "DA-BASE-10",
    "barcode": "4820123456789",
    "name": "База DARK 10мл",
    "brand": "DARK",
    "category_path": "Гель-лаки > Бази",
    "price_retail": 289.00,
    "price_wholesale": 231.00,
    "stock_qty": 143,
    "unit": "шт",
    "weight_g": 85,
    "is_active": true
  }
]
```

**Поля:**

| Поле | Тип | Обов'язкове | Опис |
|------|-----|:-----------:|------|
| external_id | string | **ТАК** | UUID товару з 1С. Формат: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| sku | string | **ТАК** | Артикул, 1-100 символів |
| name | string | **ТАК** | Назва товару, 1-500 символів |
| price_retail | number | **ТАК** | Роздрібна ціна, > 0 |
| stock_qty | integer | **ТАК** | Залишок на складі, >= 0 |
| barcode | string | ні | Штрихкод, 8-14 цифр |
| brand | string | ні | Назва бренду, до 200 символів |
| category_path | string | ні | Шлях категорії (для інформації) |
| price_wholesale | number | ні | Оптова ціна |
| unit | string | ні | Одиниця виміру (за замовчуванням "шт") |
| weight_g | integer | ні | Вага в грамах |
| is_active | boolean | ні | Активний товар (за замовчуванням true) |

**Відповідь 200:**

```json
{
  "success": true,
  "data": {
    "created": 3,
    "updated": 47,
    "errors": []
  }
}
```

**Логіка:** Якщо товар з таким `external_id` вже є на сайті — оновлюється. Немає — створюється новий.

---

### 5.2. Залишки — PATCH /api/v1/products/stock

**Напрямок:** 1С → Сайт  
**Що робить:** Швидке оновлення тільки залишків (без інших полів)  
**Ліміт:** до 500 позицій за один запит  
**Коли використовувати:** Для частого оновлення залишків (наприклад, кожні 15 хвилин)

**Запит:**

```
PATCH /api/v1/products/stock
Authorization: Bearer sk_live_xxx
Content-Type: application/json
```

**Тіло:**

```json
[
  { "external_id": "e8b5a51d-1234-4abc-9def-567890abcdef", "stock_qty": 143 },
  { "external_id": "a1b2c3d4-5678-9abc-def0-123456789abc", "stock_qty": 0 },
  { "external_id": "f0e1d2c3-b4a5-6789-0123-456789abcdef", "stock_qty": 52 }
]
```

**Поля:**

| Поле | Тип | Обов'язкове | Опис |
|------|-----|:-----------:|------|
| external_id | string | **ТАК** | UUID товару з 1С |
| stock_qty | integer | **ТАК** | Новий залишок, >= 0 |

**Відповідь 200:**

```json
{
  "success": true,
  "data": {
    "updated": 3
  }
}
```

---

### 5.3. Контрагенти — POST /api/v1/customers

**Напрямок:** 1С → Сайт  
**Що робить:** Створює або оновлює контрагентів (upsert по `external_id`)  
**Ліміт:** до 500 контрагентів за один запит

**Запит:**

```
POST /api/v1/customers
Authorization: Bearer sk_live_xxx
Content-Type: application/json
```

**Тіло:**

```json
[
  {
    "external_id": "c1d2e3f4-5678-9abc-def0-111111111111",
    "name": "Олена Іваненко",
    "company_name": "ФОП Іваненко О.В.",
    "company_code": "1234567890",
    "phone": "+380671234567",
    "email": "olena@gmail.com",
    "is_b2b": true,
    "discount_percent": 10,
    "credit_limit": 50000.00,
    "payment_terms_days": 14,
    "balance": -15000.00,
    "total_purchased": 487250.00,
    "loyalty_tier": "gold",
    "loyalty_points": 2450,
    "manager_name": "Анна"
  }
]
```

**Поля:**

| Поле | Тип | Обов'язкове | Опис |
|------|-----|:-----------:|------|
| external_id | string | **ТАК** | UUID контрагента з 1С |
| name | string | **ТАК** | ПІБ, 1-300 символів |
| phone | string | бажано | Формат: +380XXXXXXXXX |
| email | string | ні | Email клієнта |
| company_name | string | ні | Назва компанії |
| company_code | string | ні | ЄДРПОУ |
| is_b2b | boolean | ні | B2B-клієнт (за замовчуванням false) |
| discount_percent | number | ні | Відсоток знижки |
| credit_limit | number | ні | Кредитний ліміт, >= 0 |
| payment_terms_days | integer | ні | Термін оплати (днів) |
| balance | number | ні | Баланс (від'ємне = борг клієнта) |
| total_purchased | number | ні | Загальна сума покупок |
| loyalty_tier | string | ні | Рівень лояльності: `bronze`, `silver`, `gold`, `platinum` |
| loyalty_points | number | ні | Бонусні бали |
| manager_name | string | ні | Ім'я менеджера |

**ВАЖЛИВО:** Поля `balance`, `total_purchased`, `loyalty_tier`, `loyalty_points` — це те, що клієнт бачить у своєму кабінеті на сайті. Передавайте актуальні значення з 1С.

**Відповідь 200:**

```json
{
  "success": true,
  "data": {
    "created": 2,
    "updated": 15,
    "errors": []
  }
}
```

---

### 5.4. Нові клієнти з сайту — GET /api/v1/customers/new

**Напрямок:** Сайт → 1С  
**Що робить:** Повертає клієнтів, які зареєструвались на сайті і ще не синхронізовані з 1С

**Запит:**

```
GET /api/v1/customers/new?page=1&per_page=50
Authorization: Bearer sk_live_xxx
```

**Відповідь 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-з-сайту",
      "name": "Нова Клієнтка",
      "phone": "+380991234567",
      "email": "new@gmail.com",
      "company_name": "Салон Beauty",
      "is_b2b": true,
      "created_at": "2026-02-10T14:00:00Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "per_page": 50,
    "total_pages": 1
  }
}
```

---

### 5.5. Позначити клієнта як синхронізованого — PATCH /api/v1/customers/{id}/synced

**Напрямок:** 1С → Сайт  
**Що робить:** Після того як 1С створила контрагента, вона повідомляє сайту свій UUID

**Запит:**

```
PATCH /api/v1/customers/uuid-з-сайту/synced
Authorization: Bearer sk_live_xxx
Content-Type: application/json
```

**Тіло:**

```json
{
  "external_id": "uuid-контрагента-з-1с"
}
```

**ВАЖЛИВО:** `{id}` в URL — це поле `id` з відповіді GET /customers/new. `external_id` в тілі — це UUID контрагента в 1С.

**Відповідь 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid-з-сайту",
    "external_id": "uuid-контрагента-з-1с",
    "synced": true
  }
}
```

---

### 5.6. Нові замовлення — GET /api/v1/orders/new

**Напрямок:** Сайт → 1С  
**Що робить:** Повертає замовлення, які ще не забрані 1С

**Запит:**

```
GET /api/v1/orders/new?page=1&per_page=50
Authorization: Bearer sk_live_xxx
```

**Опціональні параметри:**
- `status` — фільтр по статусу (new, processing, shipped, delivered, cancelled)
- `updated_after` — фільтр по даті (ISO 8601)

**Відповідь 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-замовлення",
      "order_number": "SHINE-ABC123",
      "created_at": "2026-02-10T14:30:00Z",
      "customer_external_id": "uuid-клієнта-з-1с",
      "customer_phone": "+380671234567",
      "customer_name": "Олена Іваненко",
      "delivery_type": "np_warehouse",
      "delivery_address": "Одеса, Відділення №15",
      "payment_method": "liqpay",
      "payment_status": "paid",
      "bonus_used": 500.00,
      "discount_amount": 1245.00,
      "total_amount": 12450.00,
      "notes": "Коментар клієнта",
      "items": [
        {
          "product_id": "uuid-товару-на-сайті",
          "product_external_id": "uuid-товару-з-1с",
          "sku": "DA-BASE-10",
          "name": "База DARK 10мл",
          "quantity": 30,
          "price": 231.00,
          "discount_percent": 0,
          "total": 6930.00
        }
      ]
    }
  ],
  "meta": { "total": 3, "page": 1, "per_page": 50, "total_pages": 1 }
}
```

**ВАЖЛИВО:** Поле `customer_external_id` може бути `null`, якщо клієнт ще не синхронізований. У такому випадку шукайте клієнта по `customer_phone`.

---

### 5.7. Позначити замовлення як синхронізоване — PATCH /api/v1/orders/{id}/synced

**Напрямок:** 1С → Сайт  
**Що робить:** 1С повідомляє, що замовлення оброблено та передає свій UUID

**Запит:**

```
PATCH /api/v1/orders/uuid-замовлення/synced
Authorization: Bearer sk_live_xxx
Content-Type: application/json
```

**Тіло:**

```json
{
  "external_id": "uuid-замовлення-в-1с"
}
```

**Відповідь 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid-замовлення",
    "external_id": "uuid-замовлення-в-1с",
    "synced": true
  }
}
```

---

### 5.8. Оновити статус замовлення — PATCH /api/v1/orders/{id}/status

**Напрямок:** 1С → Сайт  
**Що робить:** Оновлює статус, ТТН, статус оплати

**Запит:**

```
PATCH /api/v1/orders/uuid-замовлення/status
Authorization: Bearer sk_live_xxx
Content-Type: application/json
```

**Тіло (всі поля необов'язкові, але хоча б одне потрібно):**

```json
{
  "status": "shipped",
  "ttn_number": "20450000123456",
  "shipped_at": "2026-02-10T16:00:00Z",
  "payment_status": "paid"
}
```

**Поля:**

| Поле | Допустимі значення |
|------|--------------------|
| status | `new`, `processing`, `shipped`, `delivered`, `cancelled` |
| ttn_number | Номер ТТН (текст) |
| shipped_at | Дата відправки (ISO 8601) |
| payment_status | `pending`, `paid`, `failed` |

**Відповідь 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid-замовлення",
    "status": "shipped",
    "ttn_number": "20450000123456",
    "payment_status": "paid"
  }
}
```

---

### 5.9. Документи (накладні) — POST /api/v1/documents

**Напрямок:** 1С → Сайт  
**Що робить:** Завантажує реалізації, повернення, рахунки  
**Ліміт:** до 100 документів за один запит

**Запит:**

```
POST /api/v1/documents
Authorization: Bearer sk_live_xxx
Content-Type: application/json
```

**Тіло:**

```json
[
  {
    "external_id": "uuid-документа-з-1с",
    "customer_external_id": "uuid-клієнта-з-1с",
    "doc_type": "sale",
    "doc_number": "РН-000234",
    "doc_date": "2026-02-10",
    "total_amount": 12450.00,
    "discount_amount": 1245.00,
    "payment_status": "paid",
    "ttn_number": "20450000123456",
    "items": [
      {
        "product_external_id": "uuid-товару-з-1с",
        "product_name": "База DARK 10мл",
        "quantity": 30,
        "price": 231.00,
        "total": 6930.00
      }
    ]
  }
]
```

**Поля:**

| Поле | Тип | Обов'язкове | Опис |
|------|-----|:-----------:|------|
| external_id | string | **ТАК** | UUID документа з 1С |
| customer_external_id | string | **ТАК** | UUID клієнта з 1С |
| doc_type | string | **ТАК** | `sale`, `return`, `invoice` |
| doc_number | string | **ТАК** | Номер документа |
| doc_date | string | **ТАК** | Дата документа (YYYY-MM-DD) |
| total_amount | number | **ТАК** | Загальна сума |
| items | array | **ТАК** | Масив рядків документа |
| discount_amount | number | ні | Сума знижки |
| payment_status | string | ні | `pending`, `paid`, `partial`, `failed` |
| ttn_number | string | ні | Номер ТТН |

**Відповідь 200:**

```json
{
  "success": true,
  "data": {
    "created": 1,
    "updated": 0,
    "errors": []
  }
}
```

---

### 5.10. Нові оплати — GET /api/v1/payments/new

**Напрямок:** Сайт → 1С  
**Що робить:** Повертає оплати зі статусом `success`, які ще не забрані 1С

**Запит:**

```
GET /api/v1/payments/new?page=1&per_page=50
Authorization: Bearer sk_live_xxx
```

**Відповідь 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-оплати",
      "order_id": "uuid-замовлення",
      "amount": 12450.00,
      "method": "liqpay",
      "transaction_id": "LP-123456789",
      "paid_at": "2026-02-10T14:35:00Z",
      "status": "success"
    }
  ],
  "meta": { "total": 2, "page": 1, "per_page": 50, "total_pages": 1 }
}
```

### Позначити оплати як синхронізовані — PATCH /api/v1/payments/new

**Запит:**

```
PATCH /api/v1/payments/new
Authorization: Bearer sk_live_xxx
Content-Type: application/json
```

**Тіло:**

```json
{
  "ids": ["uuid-оплати-1", "uuid-оплати-2"]
}
```

**Відповідь 200:**

```json
{
  "success": true,
  "data": { "updated": 2 }
}
```

---

### 5.11. Бонуси — GET /api/v1/bonuses/new

**Напрямок:** Сайт → 1С  
**Що робить:** Повертає бонусні операції, створені на сайті (наприклад, списання бонусів при оформленні замовлення)

**Запит:**

```
GET /api/v1/bonuses/new?page=1&per_page=50
Authorization: Bearer sk_live_xxx
```

**Відповідь 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-бонусної-операції",
      "customer_external_id": "uuid-клієнта-з-1с",
      "order_id": "uuid-замовлення",
      "type": "redemption",
      "amount": 500.00,
      "reason": "purchase",
      "created_at": "2026-02-10T14:30:00Z"
    }
  ]
}
```

### Позначити бонуси як синхронізовані — PATCH /api/v1/bonuses/new

**Тіло:**

```json
{
  "ids": ["uuid-1", "uuid-2"]
}
```

---

### 5.12. Бонуси з 1С — POST /api/v1/bonuses

**Напрямок:** 1С → Сайт  
**Що робить:** Нарахувати або списати бонуси (день народження, ручне нарахування, тощо)

**Запит:**

```
POST /api/v1/bonuses
Authorization: Bearer sk_live_xxx
Content-Type: application/json
```

**Тіло (один об'єкт або масив до 100):**

```json
{
  "customer_external_id": "uuid-клієнта-з-1с",
  "type": "accrual",
  "amount": 500.00,
  "reason": "birthday"
}
```

**Поля:**

| Поле | Тип | Обов'язкове | Опис |
|------|-----|:-----------:|------|
| customer_external_id | string | **ТАК** | UUID клієнта з 1С |
| type | string | **ТАК** | `accrual` (нарахування) або `redemption` (списання) |
| amount | number | **ТАК** | Сума, > 0 |
| reason | string | ні | Причина (birthday, manual, purchase, тощо) |
| order_id | string | ні | UUID замовлення (якщо пов'язано) |

**ВАЖЛИВО:** При нарахуванні бонусів, поле `loyalty_points` клієнта на сайті оновлюється автоматично.

**Відповідь 200:**

```json
{
  "success": true,
  "data": {
    "created": 1,
    "errors": []
  }
}
```

---

### 5.13. Індивідуальні B2B ціни — POST /api/v1/prices

**Напрямок:** 1С → Сайт  
**Що робить:** Завантажує персональні ціни для B2B клієнтів  
**Ліміт:** до 1000 цін за один запит

**Запит:**

```
POST /api/v1/prices
Authorization: Bearer sk_live_xxx
Content-Type: application/json
```

**Тіло:**

```json
[
  {
    "customer_external_id": "uuid-клієнта-з-1с",
    "product_external_id": "uuid-товару-з-1с",
    "price": 195.00
  }
]
```

**Поля:**

| Поле | Тип | Обов'язкове | Опис |
|------|-----|:-----------:|------|
| customer_external_id | string | **ТАК** | UUID клієнта з 1С |
| product_external_id | string | **ТАК** | UUID товару з 1С |
| price | number | **ТАК** | Індивідуальна ціна, > 0 |

**Відповідь 200:**

```json
{
  "success": true,
  "data": {
    "created": 5,
    "updated": 12,
    "errors": []
  }
}
```

---

## 6. Рекомендований порядок обміну

### Перший запуск (повна синхронізація)

```
1. POST /api/v1/products      — вивантажити ВСІ товари
2. POST /api/v1/customers      — вивантажити ВСІХ контрагентів
3. GET  /api/v1/customers/new  — забрати нових клієнтів з сайту
4. PATCH /api/v1/customers/{id}/synced — прив'язати кожного
5. POST /api/v1/prices         — вивантажити індивідуальні ціни
```

### Регулярний обмін (кожні 15 хвилин)

```
1. PATCH /api/v1/products/stock — оновити залишки
2. GET   /api/v1/orders/new     — забрати нові замовлення
3. PATCH /api/v1/orders/{id}/synced — позначити забрані
```

### Регулярний обмін (кожну годину)

```
1. POST  /api/v1/products       — оновити товари (ціни, описи)
2. POST  /api/v1/customers      — оновити контрагентів (баланси, бонуси)
3. GET   /api/v1/customers/new  — нові реєстрації
4. PATCH /api/v1/customers/{id}/synced — прив'язати нових
5. GET   /api/v1/payments/new   — забрати оплати
6. PATCH /api/v1/payments/new   — позначити забрані
```

### При зміні статусу замовлення в 1С

```
PATCH /api/v1/orders/{id}/status — оновити статус + ТТН
```

### При проведенні документа реалізації в 1С

```
POST /api/v1/documents — завантажити документ
```

---

## 7. Обробка помилок

### Алгоритм для 1С

```
ЯКЩО КодСтатусу = 200 ТОДІ
    // Обробити дані з data
    
ІНАКШЕЯКЩО КодСтатусу = 401 ТОДІ
    // Невірний токен — зупинити обмін, повідомити адміна
    
ІНАКШЕЯКЩО КодСтатусу = 429 ТОДІ
    // Перевищено ліміт — почекати 60 сек, повторити
    
ІНАКШЕЯКЩО КодСтатусу = 400 ТОДІ
    // Помилка валідації — записати в лог, пропустити запис
    
ІНАКШЕЯКЩО КодСтатусу >= 500 ТОДІ
    // Помилка сервера — повторити через 5 хвилин (макс 3 рази)
    
КІНЕЦЬЯКЩО
```

### Rate Limit

- Ліміт: 100 запитів на хвилину (за замовчуванням)
- Заголовки відповіді: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- При перевищенні: HTTP 429 + заголовок `Retry-After` (секунди)

---

## 8. Зведена таблиця ендпоінтів

| # | Метод | URL | Напрямок | Опис |
|---|-------|-----|----------|------|
| 1 | POST | /api/v1/products | 1С → Сайт | Upsert товарів (до 500) |
| 2 | PATCH | /api/v1/products/stock | 1С → Сайт | Оновлення залишків (до 500) |
| 3 | POST | /api/v1/customers | 1С → Сайт | Upsert контрагентів (до 500) |
| 4 | GET | /api/v1/customers/new | Сайт → 1С | Нові реєстрації |
| 5 | PATCH | /api/v1/customers/{id}/synced | 1С → Сайт | Прив'язка клієнта |
| 6 | GET | /api/v1/orders/new | Сайт → 1С | Нові замовлення |
| 7 | PATCH | /api/v1/orders/{id}/synced | 1С → Сайт | Позначити забраним |
| 8 | PATCH | /api/v1/orders/{id}/status | 1С → Сайт | Статус + ТТН |
| 9 | POST | /api/v1/documents | 1С → Сайт | Накладні (до 100) |
| 10 | GET | /api/v1/payments/new | Сайт → 1С | Нові оплати |
| 11 | PATCH | /api/v1/payments/new | 1С → Сайт | Позначити забраними |
| 12 | GET | /api/v1/bonuses/new | Сайт → 1С | Нові бонуси з сайту |
| 13 | PATCH | /api/v1/bonuses/new | 1С → Сайт | Позначити забраними |
| 14 | POST | /api/v1/bonuses | 1С → Сайт | Нарахувати бонуси |
| 15 | POST | /api/v1/prices | 1С → Сайт | B2B ціни (до 1000) |

---

## 9. Перевірка підключення — GET /api/v1/health

**Перший крок для програміста 1С!** Перевірити, що токен працює:

```
GET /api/v1/health
Authorization: Bearer sk_live_ваш_токен
```

**Відповідь 200:**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "token_name": "1С Обмін",
    "permissions": ["products:write", "orders:read"],
    "rate_limit": 100,
    "rate_remaining": 99,
    "ip_address": "194.44.12.1",
    "server_time": "2026-02-11T14:00:00Z",
    "api_version": "v1"
  }
}
```

Якщо отримали `"status": "ok"` — з'єднання працює, токен валідний, можна починати обмін.

---

## 10. Тестування

### Крок 1: Перевірити з'єднання

```
GET /api/v1/health
Authorization: Bearer sk_live_ваш_токен
```

Очікувана відповідь: `"status": "ok"` з вашими permissions та rate limit.

### Крок 2: Відправити тестовий товар

```json
POST /api/v1/products

[
  {
    "external_id": "00000000-0000-0000-0000-000000000001",
    "sku": "TEST-001",
    "name": "Тестовий товар",
    "price_retail": 100.00,
    "stock_qty": 10
  }
]
```

Очікувана відповідь: `{ "success": true, "data": { "created": 1, "updated": 0, "errors": [] } }`

### Крок 3: Перевірити на сайті

Товар повинен з'явитись на сайті після синхронізації.

---

## 11. Інформація про систему

| Параметр | Значення |
|----------|----------|
| Сайт | https://shineshopb2b.com |
| Базовий URL API | https://shineshopb2b.com/api/v1/ |
| Авторизація | Bearer Token (SHA-256) |
| Формат | JSON |
| Rate Limit | 100 запитів/хв (за замовчуванням) |
| Кількість ендпоінтів | 16 (15 + health) |
| Інтерактивна документація | https://shineshopb2b.com/admin/api-docs |

### 1С система клієнта

| Параметр | Значення |
|----------|----------|
| Платформа | 1С:Підприємство 8.3 (8.3.20.2290) |
| Конфігурація | BAS Small Business PROF 2.0.1.2 |
| Сервер | OKServer |
| База | MB_prod |
| Клієнт | Тонкий клієнт |

---

## 12. Контакти

- **API токен** — створюється адміністратором на https://shineshopb2b.com/admin/api-keys
- **Інтерактивна документація** — https://shineshopb2b.com/admin/api-docs (з прикладами коду і кнопкою "Спробувати")
- **Лог запитів** — https://shineshopb2b.com/admin/api-keys → вкладка "Лог запитів"
- **Моніторинг обміну** — https://shineshopb2b.com/admin/1c

---

*Документ сформовано на основі реалізованого API. Всі ендпоінти, формати запитів та відповідей — фінальні. Останнє оновлення: Лютий 2026.*
