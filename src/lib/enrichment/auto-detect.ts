// ================================================================
//  Shine Shop B2B — AI Auto-detect CSS Selectors
//  Логика: каталог → находим товар (скоринг) → fetch товара → Claude
// ================================================================

import * as cheerio from 'cheerio';
import { parseClaudeJSON } from '@/lib/parse-claude-json';
import type { AutoDetectResult } from './types';

/**
 * Auto-detect CSS selectors for a brand's product pages.
 * 1. Fetch catalog page, найти URL товара (по скорингу)
 * 2. Fetch страницу товара
 * 3. Claude анализирует HTML товара
 */
export async function autoDetectSelectors(catalogUrl: string): Promise<AutoDetectResult> {
  // ШАГ 1: Найти URL товара из каталога
  const productUrl = await findProductUrl(catalogUrl);

  if (!productUrl) {
    throw new Error(
      `Не вдалося знайти посилання на товар на сторінці ${catalogUrl}. ` +
      `Перевірте: 1) URL веде на каталог з товарами, 2) Сайт не SPA (не рендериться через JS)`,
    );
  }

  // ШАГ 2: Fetch страницу товара
  const productResponse = await fetch(productUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShineShopBot/1.0)' },
    signal: AbortSignal.timeout(15000),
  });

  if (!productResponse.ok) {
    throw new Error(`Не вдалося завантажити сторінку товару: ${productUrl} (${productResponse.status})`);
  }

  const productHtml = await productResponse.text();

  // Очистка HTML
  const cleanHtml = cleanupHtml(productHtml);

  // ШАГ 3: Claude анализирует HTML товара
  const result = await detectWithClaude(cleanHtml, productUrl);

  return {
    selectors: result.selectors,
    sample_product_url: productUrl,
    confidence: result.confidence,
  };
}

// ────── ШАГ 1: Найти URL товара (скоринг) ──────

async function findProductUrl(catalogUrl: string): Promise<string | null> {
  const response = await fetch(catalogUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShineShopBot/1.0)' },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Не вдалося завантажити каталог: ${catalogUrl} (${response.status})`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const baseUrl = new URL(catalogUrl).origin;

  // Собираем все ссылки и оцениваем каждую
  const links: { href: string; score: number }[] = [];

  $('a[href]').each((_, el) => {
    let href = $(el).attr('href');
    if (!href) return;

    // Абсолютный URL
    if (href.startsWith('/')) href = baseUrl + href;
    if (href.startsWith('//')) href = 'https:' + href;
    if (!href.startsWith('http')) return;

    // Тот же домен
    try {
      if (new URL(href).origin !== baseUrl) return;
    } catch { return; }

    // ── Скоринг ──
    let score = 0;

    // Позитивные сигналы (похоже на товар)
    if (/\/(product|tovar|catalog|shop|item)\/[^/]+\/?$/i.test(href)) score += 3;
    if (/\/[a-z0-9-]+-\d+\.html$/i.test(href)) score += 2; // slug-123.html
    if (/[?&]product_id=/i.test(href)) score += 3; // OpenCart
    if (/[?&]route=product/i.test(href)) score += 3; // OpenCart
    if (/\/p\/[^/]+/i.test(href)) score += 2; // /p/slug pattern
    if ($(el).find('img').length > 0) score += 2; // есть картинка
    if ($(el).find('.price, [class*=price]').length > 0) score += 3; // есть цена
    if ($(el).closest('[class*=product], [class*=card], [class*=item], [class*=goods]').length > 0) score += 2;

    // Проверяем родителя — если это карточка товара
    const parent = $(el).parent();
    if (parent.find('img').length > 0 && parent.text().match(/\d+\s*(₴|грн|UAH)/)) score += 3;

    // Глубина URL — товары обычно имеют 2+ сегмента
    try {
      const segments = new URL(href).pathname.split('/').filter(Boolean).length;
      if (segments >= 2) score += 1;
      if (segments >= 3) score += 1;
    } catch { /* skip */ }

    // Негативные сигналы (НЕ товар)
    if (/\/(cart|login|register|personal|order|checkout|about|contact|blog|news|faq|terms|privacy|delivery|payment|return|wishlist|compare|account)/i.test(href)) score -= 10;
    if (/\/(category|categories|brands|brand)\/?$/i.test(href)) score -= 5;
    if (href === catalogUrl) score -= 10;
    if (href === baseUrl || href === baseUrl + '/') score -= 10;
    if (href.includes('#')) score -= 2;
    if (href.includes('javascript:')) score -= 10;

    if (score > 0) {
      links.push({ href, score });
    }
  });

  // Сортируем по скору, берём лучшую
  links.sort((a, b) => b.score - a.score);

  // Дедупликация
  const seen = new Set<string>();
  const unique = links.filter(l => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });

  return unique.length > 0 ? unique[0].href : null;
}

// ────── Очистка HTML (cheerio) ──────

function cleanupHtml(html: string): string {
  const $ = cheerio.load(html);

  // Убираем ненужные элементы
  $('script, style, svg, noscript, iframe, link, meta').remove();
  $('header, footer, nav').remove(); // навигация не нужна
  $('[class*="cookie"], [class*="popup"], [class*="modal"], [class*="banner"]').remove();
  $('[class*="Cookie"], [class*="Popup"], [class*="Modal"], [class*="Banner"]').remove();

  // Берём body
  let clean = $('body').html() || $.html();

  // Убираем data-URI (очень большие)
  clean = clean.replace(/data:[^"'\s]+/g, 'data:...');

  // Убираем лишние пробелы
  clean = clean.replace(/\s+/g, ' ').trim();

  // Лимит ~15000 символов
  if (clean.length > 15000) {
    clean = clean.substring(0, 15000) + '... [обрізано]';
  }

  return clean;
}

// ────── ШАГ 3: Claude определяет селекторы ──────

async function detectWithClaude(
  html: string,
  productUrl: string,
): Promise<{ selectors: AutoDetectResult['selectors']; confidence: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Проаналізуй HTML сторінки товару nail-косметики (${productUrl}).

Знайди CSS-селектори для кожного елемента. Шукай РЕАЛЬНІ селектори що є в HTML.

HTML сторінки товару:
${html}

Поверни ТІЛЬКИ JSON без markdown-обгортки, без \`\`\`json:
{
  "selectors": {
    "title": "CSS-селектор назви товару або null",
    "description": "CSS-селектор опису товару або null",
    "photo": "CSS-селектор головного фото (img тег) або null",
    "specs": "CSS-селектор таблиці характеристик або null",
    "composition": "CSS-селектор складу або null",
    "instructions": "CSS-селектор інструкції або null"
  },
  "confidence": 0.0
}

Правила:
- Для title шукай h1 або великий заголовок з назвою товару
- Для photo шукай img в галереї/слайдері товару, не логотип чи іконки
- Для specs шукай table, dl/dt/dd, або списки з "Об'єм:", "Колір:" тощо
- Для description шукай блок тексту (не назва, не характеристики)
- Якщо елемент не знайдено — поверни null
- Селектори мають бути максимально специфічними
- confidence — від 0 до 1, наскільки ти впевнений у результатах`,
        },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text;

  if (!text) {
    if (data.error) {
      throw new Error(`Claude API помилка: ${data.error.message || JSON.stringify(data.error)}`);
    }
    throw new Error('Claude повернув порожню відповідь');
  }

  const result = parseClaudeJSON<{ selectors: Record<string, string | null>; confidence: number }>(text);

  // Фильтруем null-селекторы
  const selectors: Record<string, string | undefined> = {};
  if (result.selectors) {
    for (const [key, val] of Object.entries(result.selectors)) {
      selectors[key] = (val && val !== 'null') ? val : undefined;
    }
  }

  // Валидация — хотя бы один селектор должен быть найден
  const hasAny = Object.values(selectors).some(v => v !== undefined);
  if (!hasAny) {
    throw new Error(
      'Claude не знайшов жодного CSS-селектора. ' +
      'Можливо сайт використовує JavaScript-рендеринг (SPA) і потрібен інший підхід.',
    );
  }

  return {
    selectors: selectors as AutoDetectResult['selectors'],
    confidence: result.confidence || 0,
  };
}
