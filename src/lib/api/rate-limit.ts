import { NextResponse } from 'next/server';

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): { allowed: boolean } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) return { allowed: false };
  entry.count++;
  return { allowed: true };
}

export function getIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function tooManyRequests() {
  return NextResponse.json(
    { error: 'Забагато запитів. Спробуйте пізніше.' },
    { status: 429 }
  );
}
