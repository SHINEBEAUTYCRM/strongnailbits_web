import * as XLSX from "xlsx";
import type { ParsedFile } from "./types";

const MAX_ROWS = 10_000;

/**
 * Parse an uploaded file (Excel or CSV) into a uniform row-based structure.
 * Accepts an ArrayBuffer from FormData.
 */
export function parseFile(buffer: ArrayBuffer, filename: string): ParsedFile {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (["xlsx", "xls", "xlsm", "xlsb"].includes(ext)) {
    return parseExcel(buffer, filename);
  }
  if (["csv", "tsv", "txt"].includes(ext)) {
    return parseCsv(buffer, filename);
  }
  throw new Error(`Непідтримуваний формат файлу: .${ext}`);
}

/* ------------------------------------------------------------------ */
/*  Excel                                                             */
/* ------------------------------------------------------------------ */

function parseExcel(buffer: ArrayBuffer, filename: string): ParsedFile {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    cellNF: true,
    cellText: true,
    raw: false,
  });

  const sheets = workbook.SheetNames;
  const activeSheet = sheets[0];
  const sheet = workbook.Sheets[activeSheet];

  if (!sheet) throw new Error("Файл не містить жодного листа");

  const raw: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: true,
    rawNumbers: false,
  }) as string[][];

  const rows = raw.slice(0, MAX_ROWS).map((row) =>
    row.map((cell) => (cell === null || cell === undefined ? "" : String(cell).trim()))
  );

  return {
    filename,
    sheets,
    active_sheet: activeSheet,
    raw_rows: rows,
    total_rows: raw.length,
  };
}

/* ------------------------------------------------------------------ */
/*  CSV / TSV                                                         */
/* ------------------------------------------------------------------ */

function parseCsv(buffer: ArrayBuffer, filename: string): ParsedFile {
  const decoder = new TextDecoder("utf-8");
  let text = decoder.decode(buffer);

  // Remove BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  // Detect delimiter
  const firstLine = text.split("\n")[0] ?? "";
  const delimiter =
    firstLine.split("\t").length > firstLine.split(";").length
      ? "\t"
      : firstLine.split(";").length > firstLine.split(",").length
        ? ";"
        : ",";

  const rows = parseCsvLines(text, delimiter).slice(0, MAX_ROWS);

  return {
    filename,
    sheets: ["CSV"],
    active_sheet: "CSV",
    raw_rows: rows,
    total_rows: rows.length,
  };
}

/**
 * Simple RFC-4180 CSV parser that handles quoted fields.
 */
function parseCsvLines(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        current.push(field.trim());
        field = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        current.push(field.trim());
        field = "";
        if (current.some((c) => c !== "")) rows.push(current);
        current = [];
        if (ch === "\r") i++;
      } else {
        field += ch;
      }
    }
  }

  // Last field / row
  current.push(field.trim());
  if (current.some((c) => c !== "")) rows.push(current);

  return rows;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Extract column samples (first N non-empty values per column) */
export function getColumnSamples(
  rows: string[][],
  headerRow: number,
  dataStartRow: number,
  sampleCount = 5,
): Record<string, string[]> {
  const headers = rows[headerRow] ?? [];
  const result: Record<string, string[]> = {};

  headers.forEach((header, colIdx) => {
    if (!header) return;
    const samples: string[] = [];
    for (let r = dataStartRow; r < rows.length && samples.length < sampleCount; r++) {
      const val = rows[r]?.[colIdx] ?? "";
      if (val) samples.push(val);
    }
    result[header] = samples;
  });

  return result;
}

/** Get preview of first N rows as formatted text (for AI prompts) */
export function getRowsPreview(rows: string[][], maxRows = 30): string {
  return rows
    .slice(0, maxRows)
    .map((row, i) => `Рядок ${i + 1}: ${row.map((c) => (c ? `"${c}"` : "")).join(" | ")}`)
    .join("\n");
}

/** Detect if a row is likely a summary/total row */
export function isSummaryRow(row: string[]): boolean {
  const joined = row.join(" ").toLowerCase();
  return /\b(разом|итого|total|всього|підсумок|сумма)\b/.test(joined);
}

/** Count non-empty cells in a row */
export function nonEmptyCount(row: string[]): number {
  return row.filter((c) => c !== "").length;
}
