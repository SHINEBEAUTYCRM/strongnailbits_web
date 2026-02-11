// ================================================================
//  Shine Shop B2B — AI Auto-detect CSS Selectors
//  Uses Claude Sonnet to analyze HTML and find selectors
// ================================================================

import * as cheerio from 'cheerio';
import { autoDetectSelectors as claudeAutoDetect } from '@/lib/claude';
import { fetchPage } from './parser';
import type { AutoDetectResult } from './types';

/**
 * Auto-detect CSS selectors for a brand's product pages.
 * 1. Fetch catalog page
 * 2. Find a product link (tries multiple strategies)
 * 3. Fetch product page
 * 4. Send HTML to Claude Sonnet for selector detection
 */
export async function autoDetectSelectors(sourceUrl: string): Promise<AutoDetectResult> {
  // 1. Fetch catalog/main page
  const catalogHtml = await fetchPage(sourceUrl);
  const $catalog = cheerio.load(catalogHtml);

  // 2. Find a product link — try multiple strategies
  let productUrl = findProductLink($catalog, sourceUrl);

  // If catalog page is the main page, try finding a catalog/category link first
  if (!productUrl) {
    const catalogLink = findCatalogLink($catalog, sourceUrl);
    if (catalogLink) {
      const subHtml = await fetchPage(catalogLink);
      const $sub = cheerio.load(subHtml);
      productUrl = findProductLink($sub, catalogLink);
    }
  }

  if (!productUrl) {
    throw new Error(
      `Не знайдено жодного посилання на сторінку товару на ${sourceUrl}. ` +
      `Перевірте URL — він повинен вести на каталог або категорію з товарами.`,
    );
  }

  // 3. Fetch product page
  const productHtml = await fetchPage(productUrl);

  // Basic check — is this really a product page? (should have images and some content)
  const $product = cheerio.load(productHtml);
  const imgCount = $product('img').length;
  const textLen = $product('body').text().length;
  if (imgCount < 1 || textLen < 500) {
    throw new Error(
      `Сторінка ${productUrl} не схожа на товар (${imgCount} зображень, ${textLen} символів). ` +
      `Можливо, сайт потребує JavaScript (SPA) і парсинг статичного HTML не підтримується.`,
    );
  }

  // 4. Claude Sonnet analyzes HTML
  const { selectors, confidence } = await claudeAutoDetect(productHtml, productUrl);

  return {
    selectors,
    sample_product_url: productUrl,
    confidence,
  };
}

/**
 * Find a product link on the catalog page.
 * Tries common patterns for e-commerce sites.
 */
function findProductLink($: cheerio.CheerioAPI, baseUrl: string): string | null {
  // Common product link patterns — ordered by specificity
  const productPatterns = [
    // Explicit product URLs
    'a[href*="/product/"]',
    'a[href*="/products/"]',
    'a[href*="/tovar/"]',
    'a[href*="/tovary/"]',
    'a[href*="/item/"]',
    'a[href*="/p/"]',
    // Common in Ukrainian e-commerce
    'a[href*="-p-"]',
    'a[href*="/ua/product"]',
    'a[href*="/uk/product"]',
    // OpenCart pattern
    'a[href*="product_id="]',
    'a[href*="route=product"]',
    // WooCommerce
    'a[href*="/shop/"][href$="/"]',
    // Class-based patterns
    '.product-card a',
    '.product-item a',
    '.product-name a',
    '.product-title a',
    '.product a',
    '.catalog-item a',
    '.goods-item a',
    '[class*="product"] a[href]',
    '[class*="card"] a[href]',
    '[class*="goods"] a[href]',
    // Data attributes
    '[data-product] a',
    'a[data-product-id]',
    'a[data-id]',
    // Image grid items (common catalog layout)
    '.grid a[href]:has(img)',
    '.catalog a[href]:has(img)',
    'li a[href]:has(img)',
  ];

  const base = new URL(baseUrl);

  for (const pattern of productPatterns) {
    const links = $(pattern).toArray();
    for (const el of links) {
      const href = $(el).attr('href');
      if (!href) continue;

      const resolved = resolveProductUrl(href, baseUrl);
      if (!resolved) continue;

      // Skip navigation / category links (too short path)
      try {
        const url = new URL(resolved);
        if (url.hostname !== base.hostname) continue;
        const segments = url.pathname.split('/').filter(Boolean);
        if (segments.length >= 2) return resolved;
      } catch { continue; }
    }
  }

  // Fallback: find links that look like product pages
  // (deepest path on same domain, with at least 2 segments)
  const candidates: { url: string; depth: number; hasImg: boolean }[] = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    try {
      const resolved = new URL(href, base);
      if (resolved.hostname !== base.hostname) return;

      const segments = resolved.pathname.split('/').filter(Boolean);
      if (segments.length < 2) return;

      // Skip common non-product paths
      const path = resolved.pathname.toLowerCase();
      if (/\/(cart|checkout|login|register|account|about|contact|blog|news|faq|terms|privacy|delivery|payment|return|wishlist)/.test(path)) return;

      const hasImg = $(el).find('img').length > 0 || $(el).closest('[class*="product"]').length > 0;

      candidates.push({
        url: resolved.toString(),
        depth: segments.length,
        hasImg,
      });
    } catch {
      // skip invalid URLs
    }
  });

  // Prefer links with images, then by depth
  candidates.sort((a, b) => {
    if (a.hasImg !== b.hasImg) return b.hasImg ? 1 : -1;
    return b.depth - a.depth;
  });

  return candidates[0]?.url || null;
}

/**
 * Find a catalog/category link when the source URL is the homepage.
 */
function findCatalogLink($: cheerio.CheerioAPI, baseUrl: string): string | null {
  const catalogPatterns = [
    'a[href*="/catalog"]',
    'a[href*="/catalogue"]',
    'a[href*="/shop"]',
    'a[href*="/products"]',
    'a[href*="/tovary"]',
    'a[href*="/category"]',
    'a[href*="/kategorii"]',
    'a[href*="/collection"]',
    'nav a[href]',
  ];

  const base = new URL(baseUrl);

  for (const pattern of catalogPatterns) {
    const links = $(pattern).toArray();
    for (const el of links) {
      const href = $(el).attr('href');
      if (!href) continue;

      const resolved = resolveProductUrl(href, baseUrl);
      if (!resolved) continue;

      try {
        const url = new URL(resolved);
        if (url.hostname !== base.hostname) continue;
        if (url.pathname === '/' || url.pathname === base.pathname) continue;
        return resolved;
      } catch { continue; }
    }
  }

  return null;
}

function resolveProductUrl(href: string, baseUrl: string): string | null {
  try {
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return `https:${href}`;
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}
