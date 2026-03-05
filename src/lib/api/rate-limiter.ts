// ================================================================
//  StrongNailBits OS — In-Memory Rate Limiter
//  Sliding window rate limiter для API-токенів
// ================================================================

interface RateLimitEntry {
  timestamps: number[];
}

/** In-memory storage для rate limiting */
const store = new Map<string, RateLimitEntry>();

/** Очищення старих записів кожні 5 хвилин */
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - 60_000; // 1 хвилина
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

/**
 * Перевірити rate limit для токена.
 * @param tokenId - ID токена
 * @param limit - максимальна кількість запитів на хвилину
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  tokenId: string,
  limit: number
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();

  const now = Date.now();
  const windowStart = now - 60_000; // sliding window 1 хвилина

  let entry = store.get(tokenId);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(tokenId, entry);
  }

  // Відфільтрувати старі запити
  entry.timestamps = entry.timestamps.filter(t => t > windowStart);

  const count = entry.timestamps.length;
  const remaining = Math.max(0, limit - count - 1);

  if (count >= limit) {
    // Час скидання — коли найстаріший запит у вікні вийде за межі
    const oldestInWindow = entry.timestamps[0] || now;
    const resetAt = oldestInWindow + 60_000;

    return { allowed: false, remaining: 0, resetAt };
  }

  // Додати поточний запит
  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining,
    resetAt: now + 60_000,
  };
}
