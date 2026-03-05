/* ------------------------------------------------------------------ */
/*  AI Import — System prompts & prompt builders                     */
/* ------------------------------------------------------------------ */

import { DB_FIELDS, DB_FIELD_LABELS, type DbField } from "../types";

/** Shared system prompt for all import AI steps */
export const IMPORT_AI_SYSTEM = `
Ти — AI-асистент для імпорту даних в інтернет-магазин Strong Nail Bits B2B.
Магазин спеціалізується на nail-індустрії (гель-лаки, бази, топи, 
інструменти, декор для нігтів).

Бренди: DARK, LUNA, WEEX, GA&MA, F.O.X, Siller, DNKa, NUB, 
        Staleks, EDLEN, Saga, DEZIK.

Типові категорії: Гель-лаки, Бази, Топи, Декор, Інструменти, 
                  Рідини, Лампи, Аксесуари.

Типові ціни: 80-1500 ₴ (роздріб), опт = 70-85% від роздрібу.
Типові об'єми: 8ml, 12ml, 15ml, 30ml.

Валюта: UAH (₴). Мови: українська (основна), російська.

Відповідай тільки JSON без markdown-обгортки.
Будь конкретним і впевненим у рекомендаціях.
`.trim();

/* ------------------------------------------------------------------ */
/*  AI #1 — File structure analysis                                   */
/* ------------------------------------------------------------------ */

export function buildStructurePrompt(rawPreview: string): string {
  const fieldList = DB_FIELDS.map(
    (f) => `- ${f}: ${DB_FIELD_LABELS[f as DbField]}`
  ).join("\n");

  return `
Проаналізуй структуру файлу для імпорту товарів.
Визнач:
1. З якого рядка починаються заголовки колонок (header_row, 0-indexed)
2. З якого рядка починаються записи даних (data_start_row, 0-indexed)
3. Чи є індикатор кінця даних (data_end_indicator) — слово або патерн
4. Які колонки містять дані — active_columns (літери або індекси)
5. Які рядки пропустити (skip_rows) — порожні, логотипи, підсумки
6. Тип файлу (file_type): "прайс постачальника" / "внутрішній каталог" / "вивантаження з 1С" / "інше"

Дані (перші рядки файлу):
${rawPreview}

Поля нашої бази:
${fieldList}

Відповідай JSON:
{
  "header_row": number,
  "data_start_row": number,
  "data_end_indicator": string | null,
  "active_columns": string[],
  "skip_rows": number[],
  "file_type": string,
  "confidence": number (0-1),
  "notes": string
}
`.trim();
}

/* ------------------------------------------------------------------ */
/*  AI #2 — Column mapping                                            */
/* ------------------------------------------------------------------ */

export function buildMappingPrompt(
  columnsWithSamples: Record<string, string[]>,
  previousDecisions?: Array<{ file_column: string; db_field: string | null }>,
): string {
  const colsStr = Object.entries(columnsWithSamples)
    .map(([col, samples]) => `- "${col}" : [${samples.map((s) => `"${s}"`).join(", ")}]`)
    .join("\n");

  const fieldsStr = DB_FIELDS.map(
    (f) => `- ${f}: ${DB_FIELD_LABELS[f as DbField]}`
  ).join("\n");

  let prevStr = "";
  if (previousDecisions && previousDecisions.length > 0) {
    prevStr = `\n\nПопередні рішення користувача для схожих файлів (враховуй їх):
${previousDecisions.map((d) => `"${d.file_column}" → ${d.db_field ?? "пропущено"}`).join("\n")}`;
  }

  return `
Ти допомагаєш імпортувати товари в nail-supply інтернет-магазин.

Зіставити колонки файлу з полями бази даних.
Для кожної колонки файлу визнач відповідне поле бази.

Колонки файлу (з прикладами значень):
${colsStr}

Поля бази:
${fieldsStr}
${prevStr}

Відповідай JSON-масивом:
[
  {
    "file_column": "назва колонки з файлу",
    "db_field": "поле бази" або null,
    "confidence": number (0-1),
    "reasoning": "пояснення чому"
  }
]

Якщо колонка не відповідає жодному полю → db_field: null.
Якщо невпевнений → confidence < 0.7.
`.trim();
}

/* ------------------------------------------------------------------ */
/*  AI #3 — Validation                                                */
/* ------------------------------------------------------------------ */

export function buildValidationPrompt(
  rows: Array<{ row: number; data: Record<string, string> }>,
  brandsList: string[],
  categoriesList: string[],
): string {
  const rowsStr = rows
    .map(
      (r) =>
        `Рядок ${r.row}: ${Object.entries(r.data)
          .map(([k, v]) => `${k}="${v}"`)
          .join(", ")}`
    )
    .join("\n");

  return `
Проаналізуй дані для імпорту в nail-supply магазин.
Знайди аномалії, помилки та підозрілі значення.

Контекст:
- Середня ціна товарів: 150-800 ₴
- Середній залишок: 10-200 шт
- Бренди в базі: ${brandsList.join(", ")}
- Категорії в базі: ${categoriesList.join(", ")}

Дані для перевірки:
${rowsStr}

Для кожної проблеми вкажи:
{
  "row": номер рядка,
  "field": "поле",
  "value": "поточне значення",
  "issue": "опис проблеми",
  "suggestion": "пропозиція виправлення",
  "suggested_value": "нове значення" або null,
  "confidence": number (0-1),
  "severity": "critical" | "warning" | "info"
}

Відповідай JSON-масивом проблем. Якщо все ОК → порожній масив [].
`.trim();
}

/* ------------------------------------------------------------------ */
/*  AI #4 — Enrichment                                                */
/* ------------------------------------------------------------------ */

export function buildEnrichmentPrompt(
  products: Array<{ row: number; name: string; brand?: string; missing_fields: string[] }>,
): string {
  const productsStr = products
    .map(
      (p) =>
        `Рядок ${p.row}: назва="${p.name}"${p.brand ? `, бренд="${p.brand}"` : ""}, бракує: ${p.missing_fields.join(", ")}`
    )
    .join("\n");

  return `
Для товарів nail-індустрії згенеруй відсутні дані на основі назви.

Товари:
${productsStr}

Для кожного товару та кожного відсутнього поля:
{
  "row": номер рядка,
  "field": "поле",
  "current_value": null,
  "suggested_value": "запропоноване значення",
  "reasoning": "чому",
  "confidence": number (0-1)
}

Генеруй описи українською мовою, SEO-оптимізовані.
Slug — транслітерація латиницею через дефіс.
Категорію визначай за типом товару (гель-лак → "Гель-лаки", база → "Бази", тощо).
Об'єм та вагу витягуй з назви якщо є (наприклад "30ml" → volume: 30).

Відповідай JSON-масивом.
`.trim();
}

/* ------------------------------------------------------------------ */
/*  AI #4b — Product matching                                         */
/* ------------------------------------------------------------------ */

export function buildMatchingPrompt(
  fileProducts: Array<{ row: number; name: string; sku?: string }>,
  dbProducts: Array<{ id: string; name: string; sku: string }>,
): string {
  const fileStr = fileProducts
    .map((p) => `${p.row}. "${p.name}"${p.sku ? ` / ${p.sku}` : ""}`)
    .join("\n");

  const dbStr = dbProducts
    .map((p) => `- "${p.name}" / ${p.sku} (id: ${p.id})`)
    .join("\n");

  return `
Зіставити товари з файлу постачальника з існуючими в базі.
Постачальник може використовувати власні артикули та інші назви.

Товари з файлу:
${fileStr}

Товари в базі (назва / SKU / id):
${dbStr}

Для кожного товару з файлу знайди найкращий матч у базі.
{
  "file_row": номер рядка,
  "file_name": "назва з файлу",
  "file_sku": "артикул з файлу",
  "matched_product_id": "id з бази" або null,
  "matched_name": "назва з бази" або null,
  "matched_sku": "SKU з бази" або null,
  "confidence": number (0-1),
  "reasoning": "чому"
}

Враховуй: транслітерацію (рус↔укр↔англ), скорочення, різний порядок слів.
Якщо збіг < 0.6 → matched_product_id: null.

Відповідай JSON-масивом.
`.trim();
}

/* ------------------------------------------------------------------ */
/*  AI #5 — Post-import report                                        */
/* ------------------------------------------------------------------ */

export function buildReportPrompt(
  stats: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    price_changes: Array<{ name: string; old_price: number; new_price: number }>;
    stock_changes: Array<{ name: string; old_qty: number; new_qty: number }>;
    new_brands: string[];
    products_without_photo: number;
    products_without_description: number;
  },
): string {
  return `
Підготуй аналітичний звіт після імпорту товарів у nail-supply магазин.

Статистика:
- Всього оброблено: ${stats.total}
- Створено нових: ${stats.created}
- Оновлено існуючих: ${stats.updated}
- Пропущено: ${stats.skipped}

Зміни цін (вибірка):
${stats.price_changes
  .slice(0, 20)
  .map((c) => `"${c.name}": ${c.old_price} → ${c.new_price} ₴ (${c.new_price > c.old_price ? "+" : ""}${(((c.new_price - c.old_price) / c.old_price) * 100).toFixed(1)}%)`)
  .join("\n")}

Зміни залишків (вибірка):
${stats.stock_changes
  .slice(0, 20)
  .map((c) => `"${c.name}": ${c.old_qty} → ${c.new_qty} шт`)
  .join("\n")}

Нові бренди: ${stats.new_brands.join(", ") || "немає"}
Товарів без фото: ${stats.products_without_photo}
Товарів без опису: ${stats.products_without_description}

Згенеруй JSON-звіт:
{
  "total_imported": number,
  "new_products": number,
  "updated_products": number,
  "skipped": number,
  "price_changes": {
    "average_change_percent": number,
    "increased_above_15": number,
    "decreased_above_20": number,
    "below_cost": number
  },
  "stock_changes": {
    "went_out_of_stock": number,
    "back_in_stock": number
  },
  "recommendations": [
    { "type": "critical" | "warning" | "info", "message": "рекомендація" }
  ]
}

Рекомендації мають бути конкретними та actionable.
`.trim();
}
