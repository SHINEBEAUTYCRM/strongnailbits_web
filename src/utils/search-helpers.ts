/* ------------------------------------------------------------------ */
/*  Transliteration + brand aliases for cross-language search          */
/* ------------------------------------------------------------------ */

// ── Cyrillic → Latin (character-by-character) ──────────────────────
const CYR_TO_LAT: Record<string, string> = {
  а: "a",  б: "b",  в: "v",  г: "g",  ґ: "g",
  д: "d",  е: "e",  є: "ye", ж: "zh", з: "z",
  и: "i",  і: "i",  ї: "yi", й: "y",  к: "k",
  л: "l",  м: "m",  н: "n",  о: "o",  п: "p",
  р: "r",  с: "s",  т: "t",  у: "u",  ф: "f",
  х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
  ь: "",   ю: "yu", я: "ya",
  // Russian extras
  ё: "yo", ы: "y",  э: "e",  ъ: "",
};

/** Cyrillic text → Latin transliteration */
export function cyrToLat(text: string): string {
  const lower = text.toLowerCase();
  let result = "";
  for (const char of lower) {
    result += CYR_TO_LAT[char] ?? char;
  }
  return result;
}

// ── Latin → Cyrillic (multi-char sequences handled first) ─────────
// Sorted by length descending so "shch" is matched before "sh"
const LAT_TO_CYR_MULTI: [string, string][] = [
  ["shch", "щ"],
  ["sch", "щ"],
  ["zh", "ж"],
  ["kh", "х"],
  ["ts", "ц"],
  ["ch", "ч"],
  ["sh", "ш"],
  ["yu", "ю"],
  ["ya", "я"],
  ["yi", "ї"],
  ["ye", "є"],
  ["yo", "ё"],
];

const LAT_TO_CYR_SINGLE: Record<string, string> = {
  a: "а", b: "б", c: "к", d: "д", e: "е",
  f: "ф", g: "г", h: "х", i: "і", j: "й",
  k: "к", l: "л", m: "м", n: "н", o: "о",
  p: "п", q: "к", r: "р", s: "с", t: "т",
  u: "у", v: "в", w: "в", x: "кс", y: "и",
  z: "з",
};

/** Latin text → Cyrillic transliteration */
export function latToCyr(text: string): string {
  const lower = text.toLowerCase();
  let result = "";
  let i = 0;

  while (i < lower.length) {
    let matched = false;

    // Try multi-char sequences first (longest first)
    for (const [lat, cyr] of LAT_TO_CYR_MULTI) {
      if (lower.startsWith(lat, i)) {
        result += cyr;
        i += lat.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const char = lower[i];
      result += LAT_TO_CYR_SINGLE[char] ?? char;
      i++;
    }
  }

  return result;
}

// ── Brand aliases (Cyrillic nickname → actual brand name) ─────────
const BRAND_ALIASES = new Map<string, string>([
  ["дарк", "dark"],
  ["фокс", "f.o.x"],
  ["луна", "luna"],
  ["сіллер", "siller"],
  ["наб", "nub"],
  ["гама", "ga&ma"],
  ["едлен", "edlen"],
  ["сталекс", "staleks"],
  ["вікс", "weex"],
  ["днка", "dnka"],
  ["сага", "saga"],
  ["коді", "kodi"],
  ["кодi", "kodi"],
  ["окситон", "oxyton"],
  ["юкі", "yuki"],
  ["нейлрт", "nailrt"],
  ["дізайнер", "designer"],
]);

// ── Main function: generate all search variants for a word ────────

/**
 * Given a single search word, returns an array of unique variants
 * to search for — original, transliterated, and brand-aliased.
 *
 * Example: "дарк" → ["дарк", "dark"]
 * Example: "kodi" → ["kodi", "коді"]
 * Example: "фокс" → ["фокс", "foks", "f.o.x"]
 */
export function getSearchVariants(word: string): string[] {
  const lower = word.toLowerCase();
  const variants = new Set<string>([lower]);

  const hasCyrillic = /[а-яіїєґёы]/.test(lower);
  const hasLatin = /[a-z]/.test(lower);

  // Transliterate in the appropriate direction(s)
  if (hasCyrillic) {
    const lat = cyrToLat(lower);
    if (lat && lat !== lower) variants.add(lat);
  }
  if (hasLatin) {
    const cyr = latToCyr(lower);
    if (cyr && cyr !== lower) variants.add(cyr);
  }

  // Check brand aliases — both directions
  const currentVariants = [...variants];
  for (const v of currentVariants) {
    // Forward: alias key → alias value
    const aliasTarget = BRAND_ALIASES.get(v);
    if (aliasTarget) variants.add(aliasTarget.toLowerCase());

    // Reverse: alias value → alias key
    for (const [key, val] of BRAND_ALIASES) {
      if (v === val.toLowerCase()) variants.add(key);
    }
  }

  // Remove empty strings
  variants.delete("");

  return [...variants];
}

/**
 * Sanitize value for PostgREST filter strings.
 * Commas separate OR-conditions, parentheses are used for `in(...)`,
 * so we strip/replace them to avoid breaking the filter syntax.
 */
export function sanitize(value: string): string {
  return value.replace(/[()\\]/g, "").replace(/,/g, " ").trim();
}

/**
 * Build OR filter parts for a single word across multiple text fields.
 * Uses transliteration to generate all search variants.
 */
export function buildTextOrFilter(
  word: string,
  fields: string[],
): string[] {
  const variants = getSearchVariants(word);
  const parts: string[] = [];

  for (const v of variants) {
    const vp = `%${v}%`;
    for (const field of fields) {
      parts.push(`${field}.ilike.${vp}`);
    }
  }

  return parts;
}
