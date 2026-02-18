/**
 * Phone number utilities — normalisation & comparison
 */

/**
 * Normalise any Ukrainian phone format to +380XXXXXXXXX
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("0") && digits.length === 10) {
    return "+38" + digits;
  }
  if (digits.startsWith("380") && digits.length === 12) {
    return "+" + digits;
  }
  if (digits.startsWith("80") && digits.length === 11) {
    return "+3" + digits;
  }
  if (digits.length === 9) {
    return "+380" + digits;
  }
  return phone.startsWith("+") ? phone : "+" + digits;
}

/**
 * Last 9 digits (without country code) — for format-independent matching
 */
export function phoneLast9(phone: string): string {
  return phone.replace(/\D/g, "").slice(-9);
}
