/* ------------------------------------------------------------------ */
/*  Client-side format detection (runs in browser)                    */
/* ------------------------------------------------------------------ */

/**
 * Detect if the file is a CS-Cart multilang export.
 * Rule-based, no AI tokens needed.
 */
export function detectCSCartFormat(rows: string[][]): boolean {
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
 * Find the data start row (skip headers if present).
 */
export function findCSCartDataStart(rows: string[][]): number {
  if (rows.length === 0) return 0;

  // Check if first row has header-like keywords
  const firstRow = rows[0] ?? [];
  const hasHeaderKeywords = firstRow.some((c) =>
    /^(sku|product|language|lang|description|category|image|name|code)/i.test(
      String(c ?? "").trim()
    )
  );

  return hasHeaderKeywords ? 1 : 0;
}
