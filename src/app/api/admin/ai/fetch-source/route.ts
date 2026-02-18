import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getCachedSource, setCachedSource } from '@/lib/ai/source-cache';

interface FetchSourceRequest {
  urls: string[];
  productName: string;
  productSku?: string;
}

interface SourceImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  isProduct: boolean;
}

interface SourceResult {
  url: string;
  content: string;
  found: boolean;
  images: SourceImage[];
}

interface PageParseResult {
  content: string;
  images: SourceImage[];
}

export async function POST(request: NextRequest) {
  try {
    const body: FetchSourceRequest = await request.json();

    if (!body.urls?.length || !body.productName) {
      return NextResponse.json(
        { error: 'Missing urls or productName' },
        { status: 400 },
      );
    }

    const results: SourceResult[] = [];

    for (const baseUrl of body.urls) {
      const cached = await getCachedSource(baseUrl, body.productName);
      if (cached) {
        results.push({ url: baseUrl, content: cached, found: true, images: [] });
        continue;
      }

      try {
        const searchResult = await searchProductOnSite(
          baseUrl,
          body.productName,
          body.productSku,
        );

        if (searchResult) {
          await setCachedSource(baseUrl, body.productName, searchResult.content, true);
          results.push({
            url: baseUrl,
            content: searchResult.content,
            found: true,
            images: searchResult.images,
          });
        } else {
          const generalContent = await fetchPageContent(baseUrl);
          if (generalContent) {
            await setCachedSource(baseUrl, body.productName, generalContent, false);
          }
          results.push({ url: baseUrl, content: generalContent, found: false, images: [] });
        }
      } catch {
        results.push({ url: baseUrl, content: '', found: false, images: [] });
      }
    }

    return NextResponse.json({ sources: results });
  } catch (err) {
    console.error('[AI Fetch Source]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const FETCH_OPTS: RequestInit = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7',
  },
  signal: AbortSignal.timeout(12_000),
};

/** Simple word-overlap similarity (0..1). threshold 0.5 = good match */
function similarity(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const wordsB = b.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (!wordsA.length || !wordsB.length) return 0;
  const common = wordsA.filter(w => wordsB.includes(w));
  return common.length / Math.max(wordsA.length, wordsB.length);
}

const PRODUCT_LINK_SELECTORS = [
  'a[href*="/product"]',
  'a[href*="/tovar"]',
  'a[href*="/catalog/"]',
  'a[href*="/goods/"]',
  'a[href*="/item/"]',
  '.product-card a',
  '.product-item a',
  '.product-list-item a',
  '.catalog-item a',
  '.goods-item a',
  '.product__name a',
  '.product-title a',
  '.name a',
  'h2 a',
  'h3 a',
];

/** Step 1: Google site:domain "product name" → first matching link */
async function searchViaGoogle(
  baseUrl: string,
  name: string,
): Promise<PageParseResult | null> {
  const domain = new URL(baseUrl).hostname;
  const query = encodeURIComponent(`site:${domain} ${name}`);
  const googleUrl = `https://www.google.com/search?q=${query}&num=5`;

  try {
    const res = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.log(`[fetch-source] Google returned ${res.status} — using fallback`);
      return null;
    }

    const html = await res.text();

    // Google blocks bots with captcha — detect
    if (html.includes('detected unusual traffic') || html.includes('g-recaptcha')) {
      console.log('[fetch-source] Google CAPTCHA — using fallback');
      return null;
    }

    const $ = cheerio.load(html);

    // Extract links that point to the brand domain
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      // Google wraps links as /url?q=https://... or directly
      const match = href.match(/(?:\/url\?q=)?(https?:\/\/[^&"'\s]+)/);
      if (match) {
        const url = decodeURIComponent(match[1]);
        if (url.includes(domain) && !url.includes('google.') && !links.includes(url)) {
          links.push(url);
        }
      }
    });

    if (!links.length) return null;

    // Try the first 3 links, pick the one with best name similarity
    for (const link of links.slice(0, 3)) {
      try {
        const result = await fetchProductPage(link);
        if (result.images.length > 0 || result.content.length > 100) {
          console.log(`[fetch-source] Google found: ${link}`);
          return result;
        }
      } catch { continue; }
    }
  } catch (err) {
    console.log('[fetch-source] Google fetch error:', err);
  }

  return null;
}

/** Step 2: Crawl catalog pages, collect all product links, match by name similarity */
async function findInCatalog(
  baseUrl: string,
  productName: string,
): Promise<PageParseResult | null> {
  const catalogPages = [
    `${baseUrl}/catalog/`,
    `${baseUrl}/products/`,
    `${baseUrl}/goods/`,
    `${baseUrl}/ua/catalog/`,
    baseUrl,
  ];

  for (const catalogUrl of catalogPages) {
    try {
      const res = await fetch(catalogUrl, FETCH_OPTS);
      if (!res.ok) continue;

      const html = await res.text();
      const $ = cheerio.load(html);

      const candidates: Array<{ href: string; score: number }> = [];

      // Collect all anchor tags with text or img alt
      $('a[href]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href) return;

        const text = $el.text().trim()
          || $el.find('img').attr('alt')?.trim()
          || $el.attr('title')?.trim()
          || '';

        if (!text || text.length < 3) return;

        const fullUrl = href.startsWith('http') ? href : (() => {
          try { return new URL(href, baseUrl).href; } catch { return ''; }
        })();

        if (!fullUrl.startsWith(baseUrl)) return;
        if (fullUrl === baseUrl || fullUrl === catalogUrl) return;

        const score = similarity(productName, text);
        if (score >= 0.5) {
          candidates.push({ href: fullUrl, score });
        }
      });

      if (!candidates.length) continue;

      candidates.sort((a, b) => b.score - a.score);

      for (const c of candidates.slice(0, 3)) {
        try {
          const result = await fetchProductPage(c.href);
          if (result.images.length > 0 || result.content.length > 100) {
            console.log(`[fetch-source] Catalog match (score=${c.score.toFixed(2)}): ${c.href}`);
            return result;
          }
        } catch { continue; }
      }
    } catch { continue; }
  }

  return null;
}

async function searchProductOnSite(
  baseUrl: string,
  name: string,
  _sku?: string,
): Promise<PageParseResult | null> {
  // Step 1: Google
  const googleResult = await searchViaGoogle(baseUrl, name);
  if (googleResult) return googleResult;

  // Step 2: Catalog crawl with similarity matching
  const catalogResult = await findInCatalog(baseUrl, name);
  if (catalogResult) return catalogResult;

  return null;
}

function parseImages($: cheerio.CheerioAPI, pageUrl: string): SourceImage[] {
  const images: SourceImage[] = [];
  const seenUrls = new Set<string>();

  const imageSelectors = [
    // Product page galleries
    '.product-image img',
    '.product-gallery img',
    '.product-photo img',
    '.main-image img',
    '[itemprop="image"]',
    // WooCommerce
    '.woocommerce-product-gallery img',
    // Generic galleries
    '.gallery img',
    '.thumbnails img',
    '.product-thumbs img',
    '.slick-slide img',
    '.swiper-slide img',
    // CS-Cart / OpenCart
    '.ty-product-img img',
    '.cm-image img',
    '#product_images img',
    '.product-image-big img',
    '.additional-images img',
    'img.img-responsive[src*="image"]',
    // riornails / custom CMS
    '.product__gallery img',
    '.product__image img',
    '.product__slider img',
    '.product-slider img',
    '.product-view img',
    'img[src*="/image/"]',
    'img[src*="/images/"]',
    'img[src*="/uploads/"]',
    'img[src*="/files/"]',
    // Fallback with size filters
    '.product img[src*="product"]',
    '.product img[src*="detailed"]',
    '.product img[src*="upload"]',
    'img[src*="product"][width]',
    // Lightbox sources
    'a[data-fancybox] img',
    'a[rel="lightbox"] img',
  ];

  const origin = new URL(pageUrl).origin;

  for (const selector of imageSelectors) {
    $(selector).each((_, el) => {
      const $img = $(el);
      let src =
        $img.attr('data-src') ||
        $img.attr('data-large') ||
        $img.attr('data-zoom-image') ||
        $img.attr('src') ||
        '';

      if (
        !src ||
        src.startsWith('data:') ||
        src.endsWith('.svg') ||
        src.includes('placeholder') ||
        src.includes('no-image') ||
        src.includes('loading') ||
        src.includes('pixel')
      ) {
        return;
      }

      if (src.startsWith('//')) src = 'https:' + src;
      else if (src.startsWith('/')) src = origin + src;
      else if (!src.startsWith('http')) src = origin + '/' + src;

      if (seenUrls.has(src)) return;
      seenUrls.add(src);

      const alt = $img.attr('alt') || '';
      const width = parseInt($img.attr('width') || '0', 10);
      const height = parseInt($img.attr('height') || '0', 10);

      const isProduct =
        (width === 0 || width >= 200) &&
        (height === 0 || height >= 200) &&
        !src.includes('icon') &&
        !src.includes('logo') &&
        !src.includes('banner') &&
        !src.includes('brand') &&
        !src.includes('payment') &&
        !src.includes('delivery') &&
        !src.includes('sprite');

      images.push({
        src,
        alt,
        width: width || undefined,
        height: height || undefined,
        isProduct,
      });
    });
  }

  $('a[href*=".jpg"], a[href*=".png"], a[href*=".webp"], a[data-fancybox], a[data-lightbox]').each(
    (_, el) => {
      const href = $(el).attr('href') || '';
      if (!href || seenUrls.has(href) || href.startsWith('data:')) return;

      let fullUrl = href;
      if (fullUrl.startsWith('//')) fullUrl = 'https:' + fullUrl;
      else if (fullUrl.startsWith('/')) fullUrl = origin + fullUrl;

      seenUrls.add(fullUrl);
      images.push({ src: fullUrl, alt: '', isProduct: true });
    },
  );

  images.sort((a, b) => (b.isProduct ? 1 : 0) - (a.isProduct ? 1 : 0));
  return images.slice(0, 20);
}

async function fetchProductPage(url: string): Promise<PageParseResult> {
  const res = await fetch(url, FETCH_OPTS);
  const html = await res.text();
  const $ = cheerio.load(html);

  const images = parseImages($, url);

  $('script, style, nav, header, footer, .menu, .sidebar, .cart, .breadcrumb').remove();

  const description = $(
    '.product-description, .product-info, .description, ' +
      '[itemprop="description"], .tab-content, .product-details, ' +
      '.product__description, #description, .woocommerce-product-details__short-description',
  )
    .text()
    .trim();

  const specs = $(
    '.product-specs, .characteristics, .features, ' +
      '.specifications, table.params, .product-attributes',
  )
    .text()
    .trim();

  const title = $('h1').first().text().trim();

  const content = [
    title ? `Назва: ${title}` : '',
    description ? `Опис: ${description.substring(0, 2000)}` : '',
    specs ? `Характеристики: ${specs.substring(0, 1000)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    content:
      content ||
      $('main, .content, article, .product').text().substring(0, 2000).trim(),
    images,
  };
}

async function fetchPageContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, FETCH_OPTS);
    const html = await res.text();
    const $ = cheerio.load(html);

    $('script, style, nav, header, footer').remove();

    return $('main, .content, article, body')
      .first()
      .text()
      .substring(0, 3000)
      .trim();
  } catch {
    return '';
  }
}
