import * as cheerio from 'cheerio';
import { aiMatchProduct } from './ai-match';

export interface FoundProduct {
  url: string;
  title: string;
  confidence: number;
  match_reason: string;
}

export interface Candidate {
  url: string;
  title: string;
  price?: string;
  image?: string;
}

export async function findProductOnSite(
  sourceUrl: string,
  productCode: string,
  productName: string,
  productVolume?: string,
  brandName?: string,
): Promise<FoundProduct | null> {
  const origin = new URL(sourceUrl).origin;

  // Strategy 1: Search on site
  const searchResult = await trySearchOnSite(origin, productCode, productName);
  if (searchResult && searchResult.candidates.length > 0) {
    const match = await aiMatchProduct(
      { code: productCode, name: productName, volume: productVolume, brand: brandName },
      searchResult.candidates,
    );
    if (match) return match;
  }

  // Strategy 2: Catalog scan
  const catalogResult = await tryCatalogScan(origin, productCode, productName);
  if (catalogResult && catalogResult.candidates.length > 0) {
    const match = await aiMatchProduct(
      { code: productCode, name: productName, volume: productVolume, brand: brandName },
      catalogResult.candidates,
    );
    if (match) return match;
  }

  return null;
}


async function trySearchOnSite(
  origin: string,
  code: string,
  name: string,
): Promise<{ candidates: Candidate[] } | null> {
  const searchPaths = [
    `/search?q=${encodeURIComponent(code)}`,
    `/search/?q=${encodeURIComponent(code)}`,
    `/catalogsearch/result/?q=${encodeURIComponent(code)}`,
    `/?s=${encodeURIComponent(code)}`,
    `/search?query=${encodeURIComponent(code)}`,
  ];

  for (const path of searchPaths) {
    try {
      const res = await fetch(origin + path, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShineShopBot/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;

      const html = await res.text();
      const candidates = extractCandidates(html, origin);
      if (candidates.length > 0) return { candidates };
    } catch (err) {
      console.error('[Enrichment:FindProduct] Search attempt failed:', err);
      continue;
    }
  }

  // Fallback: search by short name
  const shortName = name.replace(/\d+\s*(мл|ml|г|g)/gi, '').trim().split(' ').slice(0, 3).join(' ');
  try {
    const res = await fetch(`${origin}/search?q=${encodeURIComponent(shortName)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShineShopBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const html = await res.text();
      const candidates = extractCandidates(html, origin);
      if (candidates.length > 0) return { candidates };
    }
  } catch (err) { console.error('[Enrichment:FindProduct] Fallback search failed:', err); }

  return null;
}


async function tryCatalogScan(
  origin: string,
  _code: string,
  _name: string,
): Promise<{ candidates: Candidate[] } | null> {
  const catalogPaths = ['/catalog/', '/products/', '/shop/', '/'];

  for (const path of catalogPaths) {
    try {
      const res = await fetch(origin + path, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShineShopBot/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;

      const html = await res.text();
      const candidates = extractCandidates(html, origin);
      if (candidates.length > 0) return { candidates };
    } catch (err) {
      console.error('[Enrichment:FindProduct] Catalog scan failed:', err);
      continue;
    }
  }

  return null;
}


function extractCandidates(html: string, origin: string): Candidate[] {
  const $ = cheerio.load(html);
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  const cardSelectors = [
    '[class*="product"] a',
    '[class*="card"] a',
    '[class*="item"] a',
    '.catalog-item a',
    '.product-list a',
    '.goods a',
  ];

  for (const selector of cardSelectors) {
    $(selector).each((_, el) => {
      const $el = $(el);
      let href = $el.attr('href');
      if (!href) return;
      if (href.startsWith('/')) href = origin + href;
      if (!href.startsWith('http')) return;
      if (seen.has(href)) return;

      if (/\/(cart|login|register|about|contact|blog|faq|category)\b/i.test(href)) return;

      const title = $el.text().trim() || $el.attr('title') || '';
      if (title.length < 3 || title.length > 200) return;

      const img = $el.find('img').attr('src') || $el.find('img').attr('data-src');
      const price = $el.closest('[class*="product"], [class*="card"], [class*="item"]')
        .find('[class*="price"]').first().text().trim();

      seen.add(href);
      candidates.push({
        url: href,
        title: title.substring(0, 150),
        price: price || undefined,
        image: img ? (img.startsWith('http') ? img : origin + img) : undefined,
      });
    });
  }

  return candidates.slice(0, 20);
}
