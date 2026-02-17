/* ------------------------------------------------------------------ */
/*  AI #4 — Data enrichment                                          */
/* ------------------------------------------------------------------ */

import type { EnrichmentSuggestion, ProductMatch, ColumnMapping, DbField } from "../types";
import { buildEnrichmentPrompt, buildMatchingPrompt } from "./prompts";
import { askClaude } from "./client";

/**
 * AI-powered enrichment: generate missing descriptions, SEO, categories, etc.
 */
export async function enrichDataAI(
  rows: string[][],
  mappings: ColumnMapping[],
  headerRow: number,
  dataStartRow: number,
): Promise<EnrichmentSuggestion[]> {
  const headers = rows[headerRow] ?? [];
  const fieldMap = new Map<number, DbField>();

  mappings.forEach((m) => {
    if (m.db_field) {
      const colIdx = headers.indexOf(m.file_column);
      if (colIdx >= 0) fieldMap.set(colIdx, m.db_field);
    }
  });

  // Find products with missing enrichable fields
  const enrichableFields: DbField[] = [
    "description_uk",
    "meta_title",
    "meta_description",
    "slug",
    "category_path",
    "volume",
    "weight",
  ];

  const mappedFields = new Set(mappings.filter((m) => m.db_field).map((m) => m.db_field!));
  const missingEnrichable = enrichableFields.filter((f) => !mappedFields.has(f));

  if (missingEnrichable.length === 0) return [];

  // Find name and brand column indices
  let nameColIdx = -1;
  let brandColIdx = -1;
  fieldMap.forEach((field, colIdx) => {
    if (field === "name_uk") nameColIdx = colIdx;
    if (field === "brand_name") brandColIdx = colIdx;
  });

  if (nameColIdx === -1) return [];

  const products: Array<{ row: number; name: string; brand?: string; missing_fields: string[] }> =
    [];

  for (let i = dataStartRow; i < rows.length && products.length < 30; i++) {
    const row = rows[i];
    if (!row) continue;
    const name = row[nameColIdx] ?? "";
    if (!name) continue;

    products.push({
      row: i,
      name,
      brand: brandColIdx >= 0 ? (row[brandColIdx] ?? undefined) : undefined,
      missing_fields: missingEnrichable,
    });
  }

  if (products.length === 0) return [];

  const prompt = buildEnrichmentPrompt(products);
  const { result } = await askClaude<EnrichmentSuggestion[]>(prompt);

  return result && Array.isArray(result) ? result : [];
}

/**
 * AI-powered product matching: match file products to existing DB products.
 */
export async function matchProductsAI(
  rows: string[][],
  mappings: ColumnMapping[],
  headerRow: number,
  dataStartRow: number,
  dbProducts: Array<{ id: string; name: string; sku: string }>,
): Promise<ProductMatch[]> {
  if (dbProducts.length === 0) return [];

  const headers = rows[headerRow] ?? [];
  const fieldMap = new Map<number, DbField>();

  mappings.forEach((m) => {
    if (m.db_field) {
      const colIdx = headers.indexOf(m.file_column);
      if (colIdx >= 0) fieldMap.set(colIdx, m.db_field);
    }
  });

  let nameColIdx = -1;
  let skuColIdx = -1;
  fieldMap.forEach((field, colIdx) => {
    if (field === "name_uk") nameColIdx = colIdx;
    if (field === "sku" || field === "supplier_sku") skuColIdx = colIdx;
  });

  if (nameColIdx === -1) return [];

  // Take batch of file products for matching
  const fileProducts: Array<{ row: number; name: string; sku?: string }> = [];
  for (let i = dataStartRow; i < rows.length && fileProducts.length < 50; i++) {
    const row = rows[i];
    if (!row) continue;
    const name = row[nameColIdx] ?? "";
    if (!name) continue;
    fileProducts.push({
      row: i,
      name,
      sku: skuColIdx >= 0 ? (row[skuColIdx] ?? undefined) : undefined,
    });
  }

  if (fileProducts.length === 0) return [];

  // Limit DB products to prevent huge prompt
  const dbSample = dbProducts.slice(0, 200);
  const prompt = buildMatchingPrompt(fileProducts, dbSample);
  const { result } = await askClaude<ProductMatch[]>(prompt);

  return result && Array.isArray(result) ? result : [];
}
