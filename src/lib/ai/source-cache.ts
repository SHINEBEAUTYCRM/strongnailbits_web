import { createAdminClient } from '@/lib/supabase/admin';

const memoryCache = new Map<string, { content: string; expires: number }>();

function cacheKey(url: string, productName: string): string {
  const short = productName.toLowerCase().split(' ').slice(0, 3).join(' ');
  return `${url}::${short}`;
}

export async function getCachedSource(
  url: string,
  productName: string,
): Promise<string | null> {
  const key = cacheKey(url, productName);
  const mem = memoryCache.get(key);
  if (mem && mem.expires > Date.now()) return mem.content;

  try {
    const supabase = createAdminClient();
    const search = productName.split(' ').slice(0, 2).join('%');
    const { data } = await supabase
      .from('ai_source_cache')
      .select('content')
      .eq('url', url)
      .ilike('product_name', `%${search}%`)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .single();

    if (data?.content) {
      memoryCache.set(key, { content: data.content, expires: Date.now() + 3600_000 });
      return data.content;
    }
  } catch {
    // cache miss
  }

  return null;
}

export async function setCachedSource(
  url: string,
  productName: string,
  content: string,
  found: boolean,
): Promise<void> {
  const key = cacheKey(url, productName);
  memoryCache.set(key, { content, expires: Date.now() + 3600_000 });

  try {
    const supabase = createAdminClient();
    await supabase.from('ai_source_cache').insert({
      url,
      product_name: productName,
      content: content.substring(0, 10_000),
      found,
    });
  } catch {
    // non-critical
  }
}
