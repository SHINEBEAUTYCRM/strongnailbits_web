/* ------------------------------------------------------------------ */
/*  Транслітерація укр/рус → латиниця + slugify                       */
/* ------------------------------------------------------------------ */

const TRANSLIT_MAP: Record<string, string> = {
  // Українська
  а: "a",  б: "b",  в: "v",  г: "h",  ґ: "g",
  д: "d",  е: "e",  є: "ye", ж: "zh", з: "z",
  и: "y",  і: "i",  ї: "yi", й: "y",  к: "k",
  л: "l",  м: "m",  н: "n",  о: "o",  п: "p",
  р: "r",  с: "s",  т: "t",  у: "u",  ф: "f",
  х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
  ь: "",   ю: "yu", я: "ya",
  // Російська (додатково)
  ё: "yo", ы: "y",  э: "e",  ъ: "",
};

/**
 * Транслітерує кирилицю → латиницю, приводить до lowercase,
 * замінює пробіли та спецсимволи на дефіс, прибирає подвійні дефіси.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((char) => {
      if (char in TRANSLIT_MAP) return TRANSLIT_MAP[char];
      // Велика літера — перевіряємо lowercase варіант
      const lower = char.toLowerCase();
      if (lower in TRANSLIT_MAP) return TRANSLIT_MAP[lower];
      return char;
    })
    .join("")
    .replace(/[^\w\s-]/g, "")   // видалити спецсимволи
    .replace(/[\s_]+/g, "-")    // пробіли/підкреслення → дефіс
    .replace(/-{2,}/g, "-")     // подвійні дефіси → один
    .replace(/^-+/, "")         // trim дефіси з початку
    .replace(/-+$/, "");        // trim дефіси з кінця
}
