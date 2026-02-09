/**
 * Format a price with Ukrainian locale and ₴ symbol.
 * 1250 → "1 250 ₴"
 */
export function formatPrice(price: number): string {
  return price.toLocaleString("uk-UA") + " ₴";
}

/**
 * Calculate discount percentage string.
 * (price=270, oldPrice=360) → "-25%"
 */
export function formatDiscount(price: number, oldPrice: number): string {
  return `-${Math.round((1 - price / oldPrice) * 100)}%`;
}

/**
 * Ukrainian plural form for "товар".
 */
export function getProductWord(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return "товарів";
  if (last === 1) return "товар";
  if (last >= 2 && last <= 4) return "товари";
  return "товарів";
}
