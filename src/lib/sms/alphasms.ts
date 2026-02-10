/**
 * AlphaSMS API client
 * Docs: https://alphasms.net/about/techdocs/
 * HTTP API: https://alphasms.net/api/http.php
 */

const API_BASE = "https://alphasms.net/api/http.php";

function getConfig() {
  const apiKey = process.env.ALPHASMS_API_KEY;
  const sender = process.env.ALPHASMS_SENDER || "ShineShop";

  if (!apiKey) {
    throw new Error("Missing ALPHASMS_API_KEY env variable");
  }

  return { apiKey, sender };
}

/** Normalise phone number to digits only (380XXXXXXXXX) */
export function normalizePhone(phone: string): string {
  // Remove everything except digits
  let digits = phone.replace(/\D/g, "");

  // 9 digits: 1C format (637443889) → 380637443889
  if (digits.length === 9) {
    digits = "380" + digits;
  }
  // 10 digits starting with 0: local format (0637443889) → 380637443889
  else if (digits.length === 10 && digits.startsWith("0")) {
    digits = "38" + digits;
  }
  // 11 digits starting with 80: missing leading 3 (80637443889) → 380637443889
  else if (digits.length === 11 && digits.startsWith("80")) {
    digits = "3" + digits;
  }
  // 12 digits starting with 380: already correct
  // 12 digits starting with something else: leave as-is
  // Any other length: leave as-is

  return digits;
}

/**
 * Get all possible phone formats for DB search.
 * 1C stores phones as "637443889" (9 digits without 38 and leading 0).
 * We store as "380637443889".
 * This returns all variants to match against.
 *
 * Input: "380637443889"
 * Returns: ["380637443889", "0637443889", "637443889", "+380637443889"]
 */
export function phoneVariants(phone: string): string[] {
  const full = normalizePhone(phone); // 380XXXXXXXXX (12 digits)
  if (full.length !== 12 || !full.startsWith("38")) {
    return [full, phone];
  }

  const withZero = "0" + full.slice(2);   // 0XXXXXXXXX (10 digits)
  const short = full.slice(3);            // XXXXXXXXX  (9 digits — 1C format)
  const withPlus = "+" + full;            // +380XXXXXXXXX

  return [full, withZero, short, withPlus];
}

/** Format phone for display: +38 (0XX) XXX-XX-XX */
export function formatPhoneDisplay(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length === 12 && digits.startsWith("38")) {
    const rest = digits.slice(2);
    return `+38 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6, 8)}-${rest.slice(8, 10)}`;
  }
  return `+${digits}`;
}

interface SendSmsResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/** Send SMS via AlphaSMS HTTP API */
export async function sendSms(
  recipient: string,
  message: string,
): Promise<SendSmsResult> {
  const { apiKey, sender } = getConfig();
  const phone = normalizePhone(recipient);

  const params = new URLSearchParams({
    version: "http",
    key: apiKey,
    command: "send",
    from: sender,
    to: phone,
    message,
  });

  try {
    const response = await fetch(`${API_BASE}?${params.toString()}`, {
      method: "GET",
      signal: AbortSignal.timeout(15000),
    });

    const text = await response.text();
    const trimmed = text.trim();

    // Success response: "id:12345"
    const idMatch = trimmed.match(/id:(\d+)/i);
    if (idMatch) {
      return { success: true, messageId: parseInt(idMatch[1], 10) };
    }

    // Error response
    console.error("[AlphaSMS] Error response:", trimmed);
    return { success: false, error: trimmed };
  } catch (err) {
    console.error("[AlphaSMS] Request failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "SMS sending failed",
    };
  }
}

/** Send OTP code via SMS */
export async function sendOtpSms(
  phone: string,
  code: string,
): Promise<SendSmsResult> {
  const message = `${code} — ваш код для ShineShop. Не повідомляйте нікому.`;
  return sendSms(phone, message);
}

/** Get AlphaSMS balance */
export async function getBalance(): Promise<number | null> {
  const { apiKey } = getConfig();

  const params = new URLSearchParams({
    version: "http",
    key: apiKey,
    command: "balance",
  });

  try {
    const response = await fetch(`${API_BASE}?${params.toString()}`);
    const text = await response.text();
    const match = text.trim().match(/balance:([\d.\-]+)/i);
    if (match) {
      return parseFloat(match[1]);
    }
    return null;
  } catch {
    return null;
  }
}
