// ================================================================
//  ShineShop OS — Crypto Utilities
//  Шифрування/дешифрування API-ключів у БД
// ================================================================

/**
 * Шифрує конфігурацію перед збереженням у БД.
 * Використовує AES-256-GCM через Web Crypto API (Edge-compatible).
 *
 * Якщо ENCRYPTION_KEY не встановлено — зберігає як є (для розробки).
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 біт для AES-GCM

function getEncryptionKey(): string | null {
  return process.env.ENCRYPTION_KEY || null;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('shineshop-os-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Шифрує об'єкт конфігурації у зашифровану строку
 */
export async function encryptConfig(
  config: Record<string, string>
): Promise<Record<string, string>> {
  const secret = getEncryptionKey();
  if (!secret) {
    // Без шифрування в dev-режимі
    return config;
  }

  const encrypted: Record<string, string> = {};
  const key = await deriveKey(secret);

  for (const [field, value] of Object.entries(config)) {
    if (!value) {
      encrypted[field] = '';
      continue;
    }

    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      encoder.encode(value)
    );

    // Зберігаємо як base64: iv:ciphertext
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const ctBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
    encrypted[field] = `enc:${ivBase64}:${ctBase64}`;
  }

  return encrypted;
}

/**
 * Дешифрує конфігурацію з БД
 */
export async function decryptConfig(
  config: Record<string, string>
): Promise<Record<string, string>> {
  const secret = getEncryptionKey();
  if (!secret) {
    return config;
  }

  const decrypted: Record<string, string> = {};
  const key = await deriveKey(secret);

  for (const [field, value] of Object.entries(config)) {
    if (!value || !value.startsWith('enc:')) {
      decrypted[field] = value || '';
      continue;
    }

    try {
      const parts = value.split(':');
      if (parts.length !== 3) {
        decrypted[field] = '';
        continue;
      }

      const ivBase64 = parts[1];
      const ctBase64 = parts[2];

      const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
      const ciphertext = Uint8Array.from(atob(ctBase64), c => c.charCodeAt(0));

      const plaintext = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv },
        key,
        ciphertext
      );

      decrypted[field] = new TextDecoder().decode(plaintext);
    } catch {
      decrypted[field] = '';
    }
  }

  return decrypted;
}

/**
 * Маскує значення для показу в UI (тільки останні 4 символи)
 */
export function maskValue(value: string): string {
  if (!value || value.length <= 4) return '••••';
  return '••••••••' + value.slice(-4);
}
