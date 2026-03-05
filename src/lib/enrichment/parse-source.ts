import * as cheerio from 'cheerio';

export interface ParsedSourceData {
  title?: string;
  description?: string;
  photos: string[];
  specs: Record<string, string>;
  composition?: string;
  instructions?: string;
  price?: string;
}

/**
 * Parse a product page and extract structured data
 */
export async function parseSourcePage(url: string): Promise<ParsedSourceData> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StrongNailBitsBot/1.0)' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const origin = new URL(url).origin;

  // Remove noise
  $('script, style, svg, header, footer, nav, [class*="cookie"], [class*="popup"], [class*="modal"]').remove();

  // Title
  const title = $('h1').first().text().trim()
    || $('[class*="product-title"], [class*="product-name"], [class*="product_title"]').first().text().trim()
    || $('title').text().trim();

  // Description
  const descSelectors = [
    '[class*="product-description"]',
    '[class*="description"]',
    '[itemprop="description"]',
    '.product-info .desc',
    '#tab-description',
    '[data-tab="description"]',
  ];
  let description = '';
  for (const sel of descSelectors) {
    const text = $(sel).first().text().trim();
    if (text && text.length > 30) { description = text; break; }
  }

  // Photos
  const photos: string[] = [];
  const photoSelectors = [
    '[class*="product-image"] img, [class*="product-photo"] img, [class*="gallery"] img',
    '[class*="slider"] img, [class*="carousel"] img',
    '.product img, .product-detail img',
  ];
  for (const sel of photoSelectors) {
    $(sel).each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy');
      if (src && !src.startsWith('data:') && !src.includes('placeholder')) {
        const full = src.startsWith('http') ? src : (src.startsWith('/') ? origin + src : origin + '/' + src);
        if (!photos.includes(full)) photos.push(full);
      }
    });
    if (photos.length > 0) break; // Use first successful selector
  }

  // Specs
  const specs: Record<string, string> = {};
  const specSelectors = [
    '[class*="characteristics"] table, [class*="specs"] table, [class*="properties"] table',
    '[class*="product-info"] table',
    '.product-attributes table',
  ];
  for (const sel of specSelectors) {
    $(sel).find('tr').each((_, row) => {
      const cells = $(row).find('td, th');
      if (cells.length >= 2) {
        const key = $(cells[0]).text().trim();
        const val = $(cells[1]).text().trim();
        if (key && val && key.length < 80) specs[key] = val;
      }
    });
    if (Object.keys(specs).length > 0) break;
  }

  // Fallback: dt/dd
  if (Object.keys(specs).length === 0) {
    $('dt').each((_, dt) => {
      const key = $(dt).text().trim();
      const val = $(dt).next('dd').text().trim();
      if (key && val && key.length < 80) specs[key] = val;
    });
  }

  // Composition
  let composition = '';
  const compSelectors = ['[class*="composition"], [class*="ingredients"], [class*="sostav"]'];
  for (const sel of compSelectors) {
    const text = $(sel).first().text().trim();
    if (text && text.length > 10) { composition = text; break; }
  }

  // Price
  const priceText = $('[class*="price"]').first().text().trim();

  return {
    title: title || undefined,
    description: description || undefined,
    photos: photos.slice(0, 10),
    specs,
    composition: composition || undefined,
    price: priceText || undefined,
  };
}
