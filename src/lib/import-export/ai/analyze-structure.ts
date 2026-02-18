/* ------------------------------------------------------------------ */
/*  AI #1 — File structure recognition                               */
/* ------------------------------------------------------------------ */

import type { FileStructureResult } from "../types";
import { getRowsPreview, isSummaryRow, nonEmptyCount } from "../parsers";
import { buildStructurePrompt } from "./prompts";
import { askClaude } from "./client";

function isCSCartMultilangFormat(rows: string[][]): boolean {
  if (rows.length < 4) return false;
  let ruUkCount = 0;
  let tripleSlashCount = 0;
  const sample = rows.slice(0, 30);
  for (const row of sample) {
    for (const cell of row) {
      const val = String(cell ?? "").trim().toLowerCase();
      if (val === "ru" || val === "uk") ruUkCount++;
      if (String(cell ?? "").includes("///")) tripleSlashCount++;
    }
  }
  return ruUkCount >= 4 && tripleSlashCount >= 2;
}

/**
 * AI-powered: analyze uploaded file to detect header row, data start, etc.
 * Checks for CS-Cart format FIRST (rule-based) before calling AI.
 */
export async function analyzeStructureAI(
  rows: string[][],
): Promise<FileStructureResult> {
  // Rule-based CS-Cart detection BEFORE AI (saves tokens)
  const cscartResult = detectCSCartFormat(rows);
  if (cscartResult) return cscartResult;

  const preview = getRowsPreview(rows, 30);
  const prompt = buildStructurePrompt(preview);
  const { result } = await askClaude<FileStructureResult>(prompt);

  if (result && result.confidence >= 0.6) {
    return result;
  }

  // Fallback to rule-based detection
  return analyzeStructureFallback(rows);
}

/**
 * Detect CS-Cart multilang export format.
 * Returns FileStructureResult with file_type = "cscart_multilang" if detected.
 */
function detectCSCartFormat(rows: string[][]): FileStructureResult | null {
  if (!isCSCartMultilangFormat(rows)) return null;

  // Determine if first row is a header or data
  const firstRowLang = rows[0]?.some((c) => c.trim().toLowerCase() === "ru" || c.trim().toLowerCase() === "uk");
  const hasHeaderKeywords = rows[0]?.some((c) =>
    /^(sku|product|language|lang|description|category|image|name)/i.test(c.trim())
  );

  const headerRow = hasHeaderKeywords ? 0 : -1;
  const dataStartRow = hasHeaderKeywords ? 1 : 0;

  // Count active columns
  const sampleRow = rows[dataStartRow] ?? [];
  const activeColumns = sampleRow
    .map((_, idx) => String.fromCharCode(65 + idx))
    .filter((_, idx) => sampleRow[idx]?.trim());

  const totalProducts = Math.floor(
    rows.filter((r) => {
      const langCol = r.findIndex((c) => c.trim().toLowerCase() === "ru" || c.trim().toLowerCase() === "uk");
      return langCol >= 0 && r[langCol]?.trim().toLowerCase() === "ru";
    }).length
  );

  return {
    header_row: Math.max(0, headerRow),
    data_start_row: dataStartRow,
    data_end_indicator: null,
    active_columns: activeColumns,
    skip_rows: headerRow >= 0 ? [] : [],
    file_type: "cscart_multilang",
    confidence: 0.97,
    notes: `CS-Cart мультимовний експорт. ~${totalProducts} товарів (${rows.length} рядків × 2 мови). Формат визначено автоматично.`,
  };
}

/**
 * Rule-based fallback: detect structure without AI.
 * Also checks for CS-Cart format.
 */
export function analyzeStructureFallback(rows: string[][]): FileStructureResult {
  // Check CS-Cart format first
  const cscartResult = detectCSCartFormat(rows);
  if (cscartResult) return cscartResult;

  let headerRow = 0;
  let maxCols = 0;

  // Find the row with most non-empty cells — likely the header
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const count = nonEmptyCount(rows[i] ?? []);
    if (count > maxCols) {
      maxCols = count;
      headerRow = i;
    }
  }

  const dataStartRow = headerRow + 1;

  const skipRows: number[] = [];
  for (let i = 0; i < headerRow; i++) {
    skipRows.push(i);
  }
  for (let i = rows.length - 1; i >= dataStartRow; i--) {
    if (isSummaryRow(rows[i] ?? [])) {
      skipRows.push(i);
    } else {
      break;
    }
  }

  const activeColumns: string[] = [];
  const headerCells = rows[headerRow] ?? [];
  headerCells.forEach((cell, idx) => {
    if (cell) {
      activeColumns.push(String.fromCharCode(65 + idx));
    }
  });

  return {
    header_row: headerRow,
    data_start_row: dataStartRow,
    data_end_indicator: null,
    active_columns: activeColumns,
    skip_rows: skipRows,
    file_type: "невизначено (автодетект)",
    confidence: 0.5,
    notes: "Визначено автоматично без AI. Рекомендуємо перевірити.",
  };
}
