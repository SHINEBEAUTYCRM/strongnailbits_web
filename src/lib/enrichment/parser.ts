// ================================================================
//  Strong Nail Bits B2B — Brand Website Parser (Cheerio)
// ================================================================

import * as cheerio from 'cheerio';
import type { ParseConfig, RawParsedData, EnrichmentBrand } from './types';

// ────── Parse product page ──────

export async function parseProductPage(
  url: string,
  selectors: ParseConfig['selectors'],
  parseOptions?: ParseConfig['parse_options'],
): Promise<RawParsedData> {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const result: RawParsedData = {
    source_url: url,
    parsed_at: new Date().toISOString(),
  };

  // Title
  if (selectors.title) {
    const title = $(selectors.title).first().text().trim();
    if (title) result.title = title;
  }

  // Description
  if (selectors.description && parseOptions?.description !== false) {
    const desc = $(selectors.description).first().html();
    if (desc) {
      // Clean HTML, keep text
      result.description = cheerio.load(desc).text().trim();
    }
  }

  // Photos
  if (selectors.photo && parseOptions?.photos !== false) {
    const photoUrls: string[] = [];
    $(selectors.photo).each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('href');
      if (src) {
        // Resolve relative URLs
        const fullUrl = resolveUrl(src, url);
        if (fullUrl && !photoUrls.includes(fullUrl)) {
          photoUrls.push(fullUrl);
        }
      }
    });
    if (photoUrls.length) result.photo_urls = photoUrls;
  }

  // Specs table
  if (selectors.specs && parseOptions?.specs !== false) {
    const specs: Record<string, string> = {};
    const specsEl = $(selectors.specs);

    // Try table rows
    specsEl.find('tr').each((_, row) => {
      const cells = $(row).find('td, th');
      if (cells.length >= 2) {
        const key = $(cells[0]).text().trim();
        const val = $(cells[1]).text().trim();
        if (key && val) specs[key] = val;
      }
    });

    // Try dl > dt/dd pairs
    if (Object.keys(specs).length === 0) {
      specsEl.find('dt').each((i, dt) => {
        const key = $(dt).text().trim();
        const dd = specsEl.find('dd').eq(i);
        const val = dd.text().trim();
        if (key && val) specs[key] = val;
      });
    }

    // Try li items with separator
    if (Object.keys(specs).length === 0) {
      specsEl.find('li').each((_, li) => {
        const text = $(li).text().trim();
        const sep = text.indexOf(':');
        if (sep > 0) {
          specs[text.slice(0, sep).trim()] = text.slice(sep + 1).trim();
        }
      });
    }

    if (Object.keys(specs).length > 0) result.specs = specs;
  }

  // Composition
  if (selectors.composition && parseOptions?.composition !== false) {
    const comp = $(selectors.composition).first().text().trim();
    if (comp) result.composition = comp;
  }

  // Instructions
  if (selectors.instructions && parseOptions?.instructions !== false) {
    const instr = $(selectors.instructions).first().text().trim();
    if (instr) result.instructions = instr;
  }

  return result;
}

// ────── Find product page on brand website ──────

export async function findProductPage(
  brand: EnrichmentBrand,
  product: { sku?: string | null; name_uk: string },
): Promise<string | null> {
  const config = brand.parse_config;
  if (!config) return null;

  const article = product.sku || '';

  // 1. Try URL pattern
  if (config.product_url_pattern && article) {
    const url = config.product_url_pattern
      .replace('{article}', encodeURIComponent(article))
      .replace('{sku}', encodeURIComponent(article));

    // Ensure full URL
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;

    try {
      const res = await fetch(fullUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return fullUrl;
    } catch (err) {
      console.error('[Enrichment:Parser] URL pattern check failed:', err);
    }
  }

  // 2. Try search URL
  if (config.search_url_pattern && article) {
    const searchUrl = config.search_url_pattern
      .replace('{article}', encodeURIComponent(article))
      .replace('{query}', encodeURIComponent(article))
      .replace('{q}', encodeURIComponent(article));

    const fullSearchUrl = searchUrl.startsWith('http') ? searchUrl : `https://${searchUrl}`;

    try {
      const html = await fetchPage(fullSearchUrl);
      const $ = cheerio.load(html);

      // Try to find a product link matching the article
      const links: string[] = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && (href.includes(article.toLowerCase()) || href.includes('product'))) {
          const resolved = resolveUrl(href, fullSearchUrl);
          if (resolved) links.push(resolved);
        }
      });

      // Also try links with product text matching
      if (links.length === 0) {
        $('a[href]').each((_, el) => {
          const text = $(el).text().toLowerCase();
          if (text.includes(article.toLowerCase()) || text.includes(product.name_uk.toLowerCase().slice(0, 20))) {
            const href = $(el).attr('href');
            if (href) {
              const resolved = resolveUrl(href, fullSearchUrl);
              if (resolved) links.push(resolved);
            }
          }
        });
      }

      if (links.length > 0) return links[0];
    } catch (err) {
      console.error('[Enrichment:Parser] Search failed:', err);
    }
  }

  return null;
}

// ────── Test parser on 1 product ──────

export async function testParser(
  brand: EnrichmentBrand,
  productUrl?: string,
): Promise<{
  url: string;
  parsed: RawParsedData;
  html_preview: string;
}> {
  const config = brand.parse_config;
  if (!config?.selectors) {
    throw new Error('Brand has no parse_config with selectors');
  }

  let url = productUrl;

  // If no URL provided, try to find a product on the source
  if (!url && brand.photo_source_url) {
    const html = await fetchPage(brand.photo_source_url);
    const $ = cheerio.load(html);

    // Find first product link
    const productLink = $('a[href*="product"], a[href*="tovar"], a[href*="catalog"]').first().attr('href');
    if (productLink) {
      url = resolveUrl(productLink, brand.photo_source_url) || undefined;
    }
  }

  if (!url) {
    throw new Error('Could not find a product URL to test');
  }

  const html = await fetchPage(url);
  const parsed = await parseProductPage(url, config.selectors, config.parse_options);

  return {
    url,
    parsed,
    html_preview: html.slice(0, 3000),
  };
}

// ────── Helpers ──────

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  return await res.text();
}

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    if (href.startsWith('//')) return `https:${href}`;
    if (href.startsWith('http')) return href;
    const base = new URL(baseUrl);
    return new URL(href, base).toString();
  } catch (err) {
    console.error('[Enrichment:Parser] URL resolve error:', err);
    return null;
  }
}

// ────── Fetch page HTML (exported for auto-detect) ──────

export { fetchPage };
