// ================================================================
//  ShineShop OS — Universal Config Resolver
//  Єдина точка отримання конфігурації для будь-якого сервісу.
//  Порядок: in-memory cache → integration_keys (DB) → env vars → null
// ================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { decryptConfig } from './crypto';
import { getServiceBySlug } from './registry';

interface CacheEntry {
  data: Record<string, string>;
  ts: number;
}

const cache = new Map<string, CacheEntry>();
const NULL_CACHE = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000;
const NULL_TTL = 60 * 1000;

export async function getServiceConfig(
  slug: string
): Promise<Record<string, string> | null> {
  const cached = cache.get(slug);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const nullTs = NULL_CACHE.get(slug);
  if (nullTs && Date.now() - nullTs < NULL_TTL) {
    return tryEnvFallback(slug);
  }

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('integration_keys')
      .select('config, is_active')
      .eq('service_slug', slug)
      .eq('is_active', true)
      .single();

    if (data?.config) {
      const decrypted = await decryptConfig(data.config);
      if (decrypted && Object.keys(decrypted).length > 0) {
        cache.set(slug, { data: decrypted, ts: Date.now() });
        NULL_CACHE.delete(slug);
        return decrypted;
      }
    }
  } catch {
    // DB недоступна — fallback на env
  }

  NULL_CACHE.set(slug, Date.now());
  return tryEnvFallback(slug);
}

function tryEnvFallback(slug: string): Record<string, string> | null {
  const service = getServiceBySlug(slug);
  if (!service?.envMapping) return null;

  const envConfig: Record<string, string> = {};
  let hasAny = false;

  for (const [field, envVar] of Object.entries(service.envMapping)) {
    const val = process.env[envVar]?.trim();
    if (val && val.length > 0) {
      envConfig[field] = val;
      hasAny = true;
    }
  }

  if (hasAny) {
    cache.set(slug, { data: envConfig, ts: Date.now() });
    return envConfig;
  }

  return null;
}

export function invalidateServiceCache(slug?: string): void {
  if (slug) {
    cache.delete(slug);
    NULL_CACHE.delete(slug);
  } else {
    cache.clear();
    NULL_CACHE.clear();
  }
}

export async function isServiceConfigured(slug: string): Promise<boolean> {
  const config = await getServiceConfig(slug);
  return config !== null;
}

export async function getServiceField(
  slug: string,
  field: string
): Promise<string | null> {
  const config = await getServiceConfig(slug);
  return config?.[field] ?? null;
}
