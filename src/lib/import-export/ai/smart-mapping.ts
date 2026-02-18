/* ------------------------------------------------------------------ */
/*  AI #2 — Intelligent column mapping                               */
/* ------------------------------------------------------------------ */

import type { ColumnMapping, DbField } from "../types";
import { DB_FIELDS, DB_FIELD_LABELS } from "../types";
import { buildMappingPrompt } from "./prompts";
import { askClaude } from "./client";

/** Common aliases for rule-based fallback mapping */
const ALIASES: Record<string, DbField> = {
  // Name
  "назва": "name_uk", "наименование": "name_uk", "наим": "name_uk", "наим.": "name_uk",
  "найменування": "name_uk", "name": "name_uk", "товар": "name_uk", "product": "name_uk",
  // SKU
  "артикул": "sku", "артикул (наш)": "sku", "sku": "sku", "код": "sku", "код товару": "sku",
  "product_code": "sku", "article": "sku",
  // Supplier SKU
  "арт.пост": "supplier_sku", "арт. пост": "supplier_sku", "арт.поставщ": "supplier_sku",
  "артикул постачальника": "supplier_sku", "артикул поставщика": "supplier_sku",
  "supplier_sku": "supplier_sku", "арт поставщика": "supplier_sku",
  // Price
  "ціна": "price", "цена": "price", "рроц": "price", "ррц": "price", "price": "price",
  "роздрібна": "price", "розничная": "price", "роздрібна ціна": "price",
  // Wholesale price
  "опт": "wholesale_price", "оптова": "wholesale_price", "оптовая": "wholesale_price",
  "дилер": "wholesale_price", "дилерська": "wholesale_price", "дилерская": "wholesale_price",
  "wholesale": "wholesale_price", "дилер.": "wholesale_price",
  // Old price
  "стара ціна": "old_price", "старая цена": "old_price", "old_price": "old_price",
  "зачеркнутая": "old_price",
  // Quantity
  "залишок": "quantity", "остаток": "quantity", "кількість": "quantity", "количество": "quantity",
  "кол-во": "quantity", "кол-во отгр.": "quantity", "кол-во отгр": "quantity",
  "qty": "quantity", "quantity": "quantity", "stock": "quantity",
  // Brand
  "бренд": "brand_name", "марка": "brand_name", "brand": "brand_name",
  "виробник": "brand_name", "производитель": "brand_name",
  // Category
  "категорія": "category_path", "категория": "category_path", "группа": "category_path",
  "група": "category_path", "category": "category_path", "розділ": "category_path",
  // Description
  "опис": "description_uk", "описание": "description_uk", "description": "description_uk",
  // Weight / Volume
  "вага": "weight", "вес": "weight", "weight": "weight",
  "об'єм": "volume", "объем": "volume", "volume": "volume",
  // Barcode
  "штрих-код": "barcode", "штрих код": "barcode", "штрихкод": "barcode",
  "ean": "barcode", "barcode": "barcode",
  // Image
  "фото": "main_image_url", "зображення": "main_image_url", "image": "main_image_url",
  "image_url": "main_image_url", "url фото": "main_image_url",
  // SEO
  "seo заголовок": "meta_title", "meta_title": "meta_title", "title": "meta_title",
  "seo опис": "meta_description", "meta_description": "meta_description",
  // Slug
  "slug": "slug", "url": "slug", "посилання": "slug",
  // Status
  "статус": "status", "status": "status",
};

/**
 * AI-powered column mapping with confidence scores and reasoning.
 */
export async function smartMappingAI(
  columnsWithSamples: Record<string, string[]>,
  previousDecisions?: Array<{ file_column: string; db_field: string | null }>,
): Promise<ColumnMapping[]> {
  const prompt = buildMappingPrompt(columnsWithSamples, previousDecisions);
  const { result } = await askClaude<ColumnMapping[]>(prompt);

  if (result && Array.isArray(result) && result.length > 0) {
    // Validate that db_fields are valid
    return result.map((m) => ({
      ...m,
      db_field:
        m.db_field && DB_FIELDS.includes(m.db_field as DbField)
          ? (m.db_field as DbField)
          : null,
    }));
  }

  // Fallback
  return smartMappingFallback(columnsWithSamples);
}

/**
 * Rule-based fallback mapping using aliases dictionary.
 */
export function smartMappingFallback(
  columnsWithSamples: Record<string, string[]>,
): ColumnMapping[] {
  const usedFields = new Set<DbField>();

  return Object.entries(columnsWithSamples).map(([column]) => {
    const normalized = column.toLowerCase().replace(/[()₴$%]/g, "").trim();

    // Try exact alias match
    let matchedField: DbField | null = null;
    let confidence = 0;
    let reasoning = "";

    for (const [alias, field] of Object.entries(ALIASES)) {
      if (normalized === alias || normalized.includes(alias)) {
        if (!usedFields.has(field)) {
          matchedField = field;
          confidence = normalized === alias ? 0.9 : 0.75;
          reasoning = `Збіг з аліасом "${alias}" → ${DB_FIELD_LABELS[field]}`;
          usedFields.add(field);
          break;
        }
      }
    }

    return {
      file_column: column,
      db_field: matchedField,
      confidence,
      reasoning: reasoning || "Не вдалося визначити автоматично",
    };
  });
}
