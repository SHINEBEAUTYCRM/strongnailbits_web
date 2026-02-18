/* ------------------------------------------------------------------ */
/*  Client-side file parser (runs in browser, no server upload)       */
/*  Uses SheetJS xlsx which works in browser environments             */
/* ------------------------------------------------------------------ */

import * as XLSX from "xlsx";
import type { ParsedFile } from "../types";

/**
 * Parse a file entirely in the browser.
 * Supports Excel (.xlsx, .xls, .xlsm, .xlsb) and CSV (.csv, .tsv, .txt).
 * No file size limit — parsing happens locally.
 */
export function parseFileClient(buffer: ArrayBuffer, filename: string): ParsedFile {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (["xlsx", "xls", "xlsm", "xlsb"].includes(ext)) {
    return parseExcelClient(buffer, filename);
  }
  if (["csv", "tsv", "txt"].includes(ext)) {
    return parseCsvClient(buffer, filename);
  }
  throw new Error(`Непідтримуваний формат файлу: .${ext}`);
}

function parseExcelClient(buffer: ArrayBuffer, filename: string): ParsedFile {
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

  // No MAX_ROWS limit for client-side — we handle all rows
  const rows = raw.map((row) =>
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

function parseCsvClient(buffer: ArrayBuffer, filename: string): ParsedFile {
  const decoder = new TextDecoder("utf-8");
  let text = decoder.decode(buffer);

  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const firstLine = text.split("\n")[0] ?? "";
  const delimiter =
    firstLine.split("\t").length > firstLine.split(";").length
      ? "\t"
      : firstLine.split(";").length > firstLine.split(",").length
        ? ";"
        : ",";

  const rows = parseCsvLines(text, delimiter);

  return {
    filename,
    sheets: ["CSV"],
    active_sheet: "CSV",
    raw_rows: rows,
    total_rows: rows.length,
  };
}

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

  current.push(field.trim());
  if (current.some((c) => c !== "")) rows.push(current);

  return rows;
}
