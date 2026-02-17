/* ------------------------------------------------------------------ */
/*  AI #1 — File structure recognition                               */
/* ------------------------------------------------------------------ */

import type { FileStructureResult } from "../types";
import { getRowsPreview, isSummaryRow, nonEmptyCount } from "../parsers";
import { buildStructurePrompt } from "./prompts";
import { askClaude } from "./client";

/**
 * AI-powered: analyze uploaded file to detect header row, data start, etc.
 */
export async function analyzeStructureAI(
  rows: string[][],
): Promise<FileStructureResult> {
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
 * Rule-based fallback: detect structure without AI.
 * Used when AI is disabled or confidence is too low.
 */
export function analyzeStructureFallback(rows: string[][]): FileStructureResult {
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

  // Data starts right after header
  const dataStartRow = headerRow + 1;

  // Find skip rows (empty rows or summary rows before data)
  const skipRows: number[] = [];
  for (let i = 0; i < headerRow; i++) {
    skipRows.push(i);
  }

  // Find summary rows at the end
  for (let i = rows.length - 1; i >= dataStartRow; i--) {
    if (isSummaryRow(rows[i] ?? [])) {
      skipRows.push(i);
    } else {
      break;
    }
  }

  // Detect active columns (those with header)
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
