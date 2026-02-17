/* ------------------------------------------------------------------ */
/*  AI #3 — Smart validation & corrections                           */
/* ------------------------------------------------------------------ */

import type { ValidationIssue, ColumnMapping, DbField } from "../types";
import { buildValidationPrompt } from "./prompts";
import { askClaude } from "./client";

/**
 * AI-powered validation: finds anomalies, price issues, brand mismatches, etc.
 */
export async function smartValidationAI(
  rows: string[][],
  mappings: ColumnMapping[],
  headerRow: number,
  dataStartRow: number,
  brandsList: string[],
  categoriesList: string[],
): Promise<ValidationIssue[]> {
  // Convert rows to mapped data objects for AI
  const headers = rows[headerRow] ?? [];
  const fieldMap = new Map<number, DbField>();

  mappings.forEach((m) => {
    if (m.db_field) {
      const colIdx = headers.indexOf(m.file_column);
      if (colIdx >= 0) fieldMap.set(colIdx, m.db_field);
    }
  });

  // Find suspicious rows (pre-filter for AI efficiency)
  const suspiciousRows: Array<{ row: number; data: Record<string, string> }> = [];

  for (let i = dataStartRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const data: Record<string, string> = {};
    let suspicious = false;

    fieldMap.forEach((field, colIdx) => {
      const value = row[colIdx] ?? "";
      data[field] = value;

      // Pre-filter: check for obvious issues
      if (field === "price" || field === "wholesale_price") {
        const num = parseFloat(value.replace(/[^\d.,]/g, "").replace(",", "."));
        if (!isNaN(num) && (num < 5 || num > 50000)) suspicious = true;
      }
      if (field === "quantity") {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num < 0) suspicious = true;
      }
    });

    // Check wholesale vs retail
    const price = parseFloat((data.price ?? "").replace(/[^\d.,]/g, "").replace(",", "."));
    const wholesale = parseFloat(
      (data.wholesale_price ?? "").replace(/[^\d.,]/g, "").replace(",", ".")
    );
    if (!isNaN(price) && !isNaN(wholesale) && wholesale > price) {
      suspicious = true;
    }

    // Always add a sample of rows (every 50th) for context
    if (suspicious || i % 50 === 0) {
      suspiciousRows.push({ row: i, data });
    }
  }

  // Limit to prevent huge prompts
  const batch = suspiciousRows.slice(0, 50);
  if (batch.length === 0) return [];

  const prompt = buildValidationPrompt(batch, brandsList, categoriesList);
  const { result } = await askClaude<ValidationIssue[]>(prompt);

  if (result && Array.isArray(result)) {
    return result;
  }

  // Fallback: basic rule-based validation
  return basicValidation(rows, mappings, headerRow, dataStartRow);
}

/**
 * Rule-based fallback validation.
 */
export function basicValidation(
  rows: string[][],
  mappings: ColumnMapping[],
  headerRow: number,
  dataStartRow: number,
): ValidationIssue[] {
  const headers = rows[headerRow] ?? [];
  const fieldMap = new Map<number, DbField>();
  const issues: ValidationIssue[] = [];

  mappings.forEach((m) => {
    if (m.db_field) {
      const colIdx = headers.indexOf(m.file_column);
      if (colIdx >= 0) fieldMap.set(colIdx, m.db_field);
    }
  });

  for (let i = dataStartRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const data: Record<string, string> = {};
    fieldMap.forEach((field, colIdx) => {
      data[field] = row[colIdx] ?? "";
    });

    // Price too low
    if (data.price) {
      const price = parseFloat(data.price.replace(/[^\d.,]/g, "").replace(",", "."));
      if (!isNaN(price) && price > 0 && price < 10) {
        issues.push({
          row: i,
          field: "price",
          value: data.price,
          issue: `Ціна ${price} ₴ — підозріло низька`,
          suggestion: "Можливо пропущено розряд?",
          confidence: 0.8,
          severity: "critical",
        });
      }
    }

    // Wholesale > retail
    if (data.price && data.wholesale_price) {
      const price = parseFloat(data.price.replace(/[^\d.,]/g, "").replace(",", "."));
      const wholesale = parseFloat(
        data.wholesale_price.replace(/[^\d.,]/g, "").replace(",", ".")
      );
      if (!isNaN(price) && !isNaN(wholesale) && wholesale > price && price > 0) {
        issues.push({
          row: i,
          field: "wholesale_price",
          value: data.wholesale_price,
          issue: `Оптова ціна ${wholesale} ₴ > роздрібної ${price} ₴`,
          suggestion: "Можливо переплутані колонки?",
          confidence: 0.85,
          severity: "critical",
        });
      }
    }

    // Zero price for a product with name
    if (data.name_uk && data.price) {
      const price = parseFloat(data.price.replace(/[^\d.,]/g, "").replace(",", "."));
      if (price === 0) {
        issues.push({
          row: i,
          field: "price",
          value: "0",
          issue: `Нульова ціна для "${data.name_uk}"`,
          suggestion: "Товар з нульовою ціною не відображатиметься",
          confidence: 0.9,
          severity: "warning",
        });
      }
    }

    // Negative quantity
    if (data.quantity) {
      const qty = parseInt(data.quantity, 10);
      if (!isNaN(qty) && qty < 0) {
        issues.push({
          row: i,
          field: "quantity",
          value: data.quantity,
          issue: `Від'ємний залишок: ${qty}`,
          suggestion: "Встановити 0?",
          suggested_value: "0",
          confidence: 0.95,
          severity: "warning",
        });
      }
    }
  }

  return issues;
}
