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
 * 2. Find a product link
 * 3. Fetch product page
 * 4. Send HTML to Claude Sonnet for selector detection
 */
export async function autoDetectSelectors(sourceUrl: string): Promise<AutoDetectResult> {
  // 1. Fetch catalog/main page
  const catalogHtml = await fetchPage(sourceUrl);
  const $catalog = cheerio.load(catalogHtml);

  // 2. Find a product link
  const productUrl = findProductLink($catalog, sourceUrl);
  if (!productUrl) {
    throw new Error(`Could not find any product link on ${sourceUrl}`);
  }

  // 3. Fetch product page
  const productHtml = await fetchPage(productUrl);

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
  // Common product link patterns
  const productPatterns = [
    'a[href*="/product/"]',
    'a[href*="/products/"]',
    'a[href*="/tovar/"]',
    'a[href*="/tovary/"]',
    'a[href*="/catalog/"][href*="/"]',
    'a[href*="/shop/"]',
    'a[href*="/item/"]',
    '.product-card a',
    '.product-item a',
    '.product a',
    '.catalog-item a',
    '[class*="product"] a',
    '[class*="card"] a[href]',
  ];

  for (const pattern of productPatterns) {
    const link = $(pattern).first().attr('href');
    if (link) {
      return resolveProductUrl(link, baseUrl);
    }
  }

  // Fallback: find links that look like product pages (have more path segments)
  const base = new URL(baseUrl);
  let bestLink: string | null = null;
  let bestSegments = 0;

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    try {
      const resolved = new URL(href, base);
      // Same domain, not just root
      if (resolved.hostname === base.hostname) {
        const segments = resolved.pathname.split('/').filter(Boolean).length;
        if (segments > bestSegments && segments >= 2) {
          bestLink = resolved.toString();
          bestSegments = segments;
        }
      }
    } catch {
      // skip invalid URLs
    }
  });

  return bestLink;
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
