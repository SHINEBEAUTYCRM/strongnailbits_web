// ================================================================
//  ShineShop OS — API Response Helpers
//  Стандартний формат відповідей для /api/v1/*
// ================================================================

import { NextResponse } from 'next/server';

/**
 * Успішна відповідь
 */
export function apiSuccess<T>(
  data: T,
  meta?: { total?: number; page?: number; per_page?: number; total_pages?: number },
  status = 200
) {
  const body: Record<string, unknown> = { success: true, data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status });
}

/**
 * Відповідь з помилкою
 */
export function apiError(
  code: string,
  message: string,
  status: number,
  details?: Array<{ field: string; message: string }>
) {
  const error: Record<string, unknown> = { code, message };
  if (details && details.length > 0) error.details = details;
  return NextResponse.json({ success: false, error }, { status });
}

// Зручні обгортки для типових помилок

export function apiUnauthorized(message = 'Missing API token') {
  return apiError('UNAUTHORIZED', message, 401);
}

export function apiForbidden(message = 'Insufficient permissions') {
  return apiError('FORBIDDEN', message, 403);
}

export function apiNotFound(message = 'Resource not found') {
  return apiError('NOT_FOUND', message, 404);
}

export function apiRateLimit(message = 'Rate limit exceeded') {
  return apiError('RATE_LIMIT_EXCEEDED', message, 429);
}

export function apiValidationError(
  message: string,
  details?: Array<{ field: string; message: string }>
) {
  return apiError('VALIDATION_ERROR', message, 400, details);
}

export function apiServerError(message = 'Internal server error') {
  return apiError('INTERNAL_ERROR', message, 500);
}

/**
 * Обрізати тіло запиту до maxBytes для логування
 */
export function truncateBody(body: unknown, maxBytes = 10240): unknown {
  if (!body) return null;
  const str = JSON.stringify(body);
  if (str.length <= maxBytes) return body;
  return { _truncated: true, _size: str.length, _preview: str.slice(0, 500) };
}

/**
 * Отримати IP з запиту
 */
export function getClientIP(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Парсити параметри пагінації
 */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const per_page = Math.min(500, Math.max(1, parseInt(searchParams.get('per_page') || '50', 10)));
  const offset = (page - 1) * per_page;
  return { page, per_page, offset };
}

/**
 * SHA-256 hash токена (Web Crypto API — Edge-compatible)
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
