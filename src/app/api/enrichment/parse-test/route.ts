// POST /api/enrichment/parse-test
// Body: { brand_id, product_id? }
// Tests parser on 1 product from brand: finds it on brand site, parses with selectors

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { brand_id, product_id } = body;

  if (!brand_id) {
    return NextResponse.json({ error: 'brand_id is required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 1. Получить бренд с parse_config
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, name, slug, photo_source_url, info_source_url, parse_config')
    .eq('id', brand_id)
    .single();

  if (brandError || !brand) {
    return NextResponse.json({ error: 'Бренд не знайдено' }, { status: 404 });
  }

  if (!brand.parse_config?.selectors) {
    return NextResponse.json({ error: 'Селектори не налаштовані. Спочатку натисніть "Налаштувати автоматично".' }, { status: 400 });
  }

  // 2. Получить товар для теста
  const productFields = 'id, name_uk, sku, price, description_uk, main_image_url, brand_id';
  let product;
  if (product_id) {
    const { data } = await supabase
      .from('products')
      .select(productFields)
      .eq('id', product_id)
      .single();
    product = data;
  } else {
    // Берём случайный товар бренда у которого есть артикул
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brand_id)
      .not('sku', 'is', null);

    const total = count || 0;
    const randomOffset = total > 1 ? Math.floor(Math.random() * total) : 0;

    const { data } = await supabase
      .from('products')
      .select(productFields)
      .eq('brand_id', brand_id)
      .not('sku', 'is', null)
      .range(randomOffset, randomOffset)
      .single();
    product = data;
  }

  if (!product) {
    return NextResponse.json({ error: 'Товар не знайдено для цього бренду' }, { status: 404 });
  }

  try {
    // 3. Найти страницу товара на сайте бренда
    const productUrl = await findProductOnBrandSite(brand, product);

    if (!productUrl) {
      return NextResponse.json({
        error: `Не вдалося знайти товар "${product.name_uk}" на сайті бренду`,
        product_name: product.name_uk,
        product_code: product.sku,
      }, { status: 404 });
    }

    // 4. Парсить страницу найденными селекторами
    const parsed = await parseProductPage(productUrl, brand.parse_config.selectors);

    return NextResponse.json({
      success: true,
      product_name: product.name_uk,
      product_code: product.sku,
      product_url: productUrl,
      parsed,
      original: {
        name_uk: product.name_uk,
        description_uk: product.description_uk || null,
        main_image_url: product.main_image_url || null,
        price: product.price,
        sku: product.sku,
      },
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Помилка тестування парсера',
    }, { status: 500 });
  }
}


// ────── Поиск товара на сайте бренда ──────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findProductOnBrandSite(brand: any, product: any): Promise<string | null> {
  const config = brand.parse_config;
  const baseUrl = brand.photo_source_url || brand.info_source_url;
  if (!baseUrl) return null;

  const origin = new URL(baseUrl).origin;
  const article = product.sku || '';
  const name = product.name_uk || '';
  const fetchOpts = {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShineShopBot/1.0)' },
    signal: AbortSignal.timeout(10000),
  };

  // Стратегия 1: URL-паттерн (если есть)
  if (config.product_url_pattern && article) {
    const url = config.product_url_pattern
      .replace('{article}', encodeURIComponent(article))
      .replace('{slug}', article.toLowerCase().replace(/\s+/g, '-'));

    try {
      const fullUrl = url.startsWith('http') ? url : origin + url;
      const res = await fetch(fullUrl, { ...fetchOpts, method: 'HEAD' });
      if (res.ok) return fullUrl;
    } catch { /* try next strategy */ }
  }

  // Стратегия 2: Поиск на сайте (если есть search_url_pattern)
  if (config.search_url_pattern && article) {
    const searchUrl = config.search_url_pattern
      .replace('{query}', encodeURIComponent(article))
      .replace('{article}', encodeURIComponent(article));

    try {
      const fullUrl = searchUrl.startsWith('http') ? searchUrl : origin + searchUrl;
      const res = await fetch(fullUrl, fetchOpts);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        // Ищем первую ссылку на товар в результатах
        const link = $('a[href*="product"], a[href*="tovar"], a[href*="catalog"] img, a[href*="shop"] img')
          .closest('a')
          .first()
          .attr('href');
        if (link) {
          return link.startsWith('http') ? link : origin + link;
        }
      }
    } catch { /* try next strategy */ }
  }

  // Стратегия 3: Поиск по каталогу бренда — ищем ссылку содержащую артикул или часть названия
  if (article || name) {
    try {
      const res = await fetch(baseUrl, fetchOpts);
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);

        let found: string | null = null;
        const searchTerms = [
          article.toLowerCase(),
          // Также ищем по первому слову названия длиннее 3 символов
          ...name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3),
        ].filter(Boolean);

        $('a[href]').each((_, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().toLowerCase();

          for (const term of searchTerms) {
            if (
              href.toLowerCase().includes(term) ||
              text.includes(term)
            ) {
              found = href.startsWith('http') ? href : origin + href;
              return false; // break
            }
          }
        });

        if (found) return found;
      }
    } catch { /* no result */ }
  }

  return null;
}


// ────── Парсинг страницы товара CSS-селекторами ──────

async function parseProductPage(url: string, selectors: Record<string, string | null>) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShineShopBot/1.0)' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Не вдалося завантажити ${url}: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const pageOrigin = new URL(url).origin;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};

  // Назва
  if (selectors.title) {
    result.title = $(selectors.title).first().text().trim() || null;
  }

  // Опис
  if (selectors.description) {
    result.description = $(selectors.description).first().text().trim() || null;
  }

  // Фото
  if (selectors.photo) {
    const photos: string[] = [];
    $(selectors.photo).each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy') || $(el).attr('href');
      if (src && !src.startsWith('data:')) {
        const fullUrl = src.startsWith('http') ? src : (src.startsWith('/') ? pageOrigin + src : pageOrigin + '/' + src);
        if (!photos.includes(fullUrl)) photos.push(fullUrl);
      }
    });
    result.photos = photos;
    result.photo_count = photos.length;
  }

  // Характеристики
  if (selectors.specs) {
    const specs: Record<string, string> = {};
    // Попробовать как таблицу
    $(selectors.specs).find('tr').each((_, row) => {
      const cells = $(row).find('td, th');
      if (cells.length >= 2) {
        const key = $(cells[0]).text().trim();
        const val = $(cells[1]).text().trim();
        if (key && val) specs[key] = val;
      }
    });
    // Попробовать как dl/dt/dd
    if (Object.keys(specs).length === 0) {
      $(selectors.specs).find('dt').each((_, dt) => {
        const key = $(dt).text().trim();
        const val = $(dt).next('dd').text().trim();
        if (key && val) specs[key] = val;
      });
    }
    result.specs = specs;
    result.specs_count = Object.keys(specs).length;
  }

  // Склад
  if (selectors.composition) {
    result.composition = $(selectors.composition).first().text().trim() || null;
  }

  // Інструкція
  if (selectors.instructions) {
    result.instructions = $(selectors.instructions).first().text().trim() || null;
  }

  return result;
}
