// POST /api/enrichment/generate
// Generate AI enrichment for a single product
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { findProductOnSite } from '@/lib/enrichment/find-product-on-site';
import { parseSourcePage } from '@/lib/enrichment/parse-source';
import { parseClaudeJSON } from '@/lib/parse-claude-json';

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { product_id, sources, use_vision, feedback } = body as {
    product_id: string;
    sources: string[];
    use_vision?: boolean;
    feedback?: string;
  };

  if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  const supabase = createAdminClient();

  // 1. Get product
  const { data: product } = await supabase
    .from('products')
    .select('id, name_uk, sku, slug, price, description_uk, main_image_url, images, photo_sources, category_id, brand_id, properties')
    .eq('id', product_id)
    .single();

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  // Get brand
  let brand = { name: '', slug: '' };
  if (product.brand_id) {
    const { data } = await supabase.from('brands').select('name, slug').eq('id', product.brand_id).single();
    if (data) brand = data;
  }

  // Get category
  let categoryName = '';
  if (product.category_id) {
    const { data } = await supabase.from('categories').select('name_uk').eq('id', product.category_id).single();
    if (data) categoryName = data.name_uk;
  }

  // 2. For each source: find product → parse
  const parsedSources: { name: string; url: string; data: Awaited<ReturnType<typeof parseSourcePage>> }[] = [];
  const sourceMatches: { name: string; url?: string; found: boolean; confidence?: number; reason?: string }[] = [];

  for (const sourceUrl of (sources || [])) {
    const hostname = new URL(sourceUrl).hostname;
    try {
      const found = await findProductOnSite(
        sourceUrl,
        product.sku || '',
        product.name_uk,
        undefined,
        brand.name,
      );

      if (found && found.confidence >= 0.6) {
        sourceMatches.push({ name: hostname, url: found.url, found: true, confidence: found.confidence, reason: found.match_reason });
        const parsed = await parseSourcePage(found.url);
        parsedSources.push({ name: hostname, url: found.url, data: parsed });
      } else {
        sourceMatches.push({ name: hostname, found: false });
      }
    } catch {
      sourceMatches.push({ name: hostname, found: false });
    }
  }

  // 3. Get brand products for cross-linking
  const { data: brandProducts } = await supabase
    .from('products')
    .select('slug, name_uk')
    .eq('brand_id', product.brand_id || '')
    .neq('id', product_id)
    .limit(50);

  // 4. Build prompt and call Claude
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'CLAUDE_API_KEY not configured' }, { status: 500 });

  const sourcesText = parsedSources.map(s =>
    `### ${s.name}\nОпис: ${s.data.description || '—'}\nХарактеристики: ${JSON.stringify(s.data.specs)}\nСклад: ${s.data.composition || '—'}`,
  ).join('\n\n');

  const brandProductsList = (brandProducts || []).map(p => `- <a href="/product/${p.slug}">${p.name_uk}</a>`).join('\n');

  const systemPrompt = `Ти — копірайтер інтернет-магазину nail-косметики SHINE SHOP.
Пишеш для МАЙСТРІВ МАНІКЮРУ — професіоналів.

КАТЕГОРИЧНО ЗАБОРОНЕНО:
- "розроблений для створення стійких та елегантних дизайнів"
- "ідеально підходить як для професіоналів, так і для домашнього використання"
- "гарантує довготривалу носку та яскраву колірність"
- "високоякісний продукт від відомого бренду"
- "забезпечує економічне використання в салоні"
- Будь-які загальні фрази що підходять до БУДЬ-ЯКОГО товару

ПИШИ ТІЛЬКИ КОНКРЕТИКУ:
- "Щільний в 1 шар, кремова текстура, не розтікається"
- "Самовирівнюється, підходить для арочного моделювання"
- "Полімеризація UV/LED 60 сек, знімається спилюванням"
- Тільки факти з джерел або аналізу фото. НЕ ВИГАДУЙ.

ФОРМАТ ПОСИЛАНЬ — ТІЛЬКИ HTML:
✅ Правильно: Наносьте на <a href="/product/dark-pro-base-02-15-ml">DARK PRO Base</a>
❌ Неправильно: Рекомендуємо з [DARK PRO base](/product/dark-pro-base-02-15-ml-uk)
НІКОЛИ не використовуй квадратні дужки [] та круглі дужки () для посилань!

ФОРМАТ ХАРАКТЕРИСТИК — ТІЛЬКИ технічні:
✅ Правильно: "Колір": "рожевий", "Фініш": "глянець", "Щільність": "щільний"
❌ Неправильно: "brend": "DARK", "artikul": "dicg0315", "kategoriya": "Гели DARK"
НЕ включай brand, article, category, price — вони вже є на сторінці!`;

  const prompt = `## Товар
Назва: ${product.name_uk}
Артикул: ${product.sku || '—'}
Категорія: ${categoryName || '—'}
Бренд: ${brand.name || '—'}

## Дані з джерел
${sourcesText || 'Зовнішні джерела не знайдені — генеруй тільки по назві та категорії.'}

## Товари бренду для перелінковки
${brandProductsList || 'Немає інших товарів бренду'}

${feedback ? `## Замечания адміна\n${feedback}` : ''}

Відповідай ТІЛЬКИ валідним JSON без markdown:
{
  "description_uk": "HTML текст. Посилання ТІЛЬКИ як <a href=\\"/product/slug\\">Назва</a>. НІКОЛИ не [текст](url).",
  "specs": {
    "Колір": { "value": "назва кольору", "source": "vision або назва сайту" },
    "Фініш": { "value": "глянець/мат/шимер", "source": "..." },
    "Щільність": { "value": "щільний/середній/рідкий", "source": "..." },
    "Полімеризація": { "value": "UV/LED XX сек", "source": "..." },
    "Обʼєм": { "value": "XX мл", "source": "..." }
  },
  "season_tags": ["універсальний"],
  "style_tags": ["класика"],
  "compatible_slugs": ["slug-1", "slug-2"]
}

ПРАВИЛА ДЛЯ specs:
- Ключі УКРАЇНСЬКОЮ: Колір, Фініш, Щільність, Полімеризація, Обʼєм, Формула, Зняття
- НЕ ВКЛЮЧАЙ: brand, brend, article, artikul, category, kategoriya, price, ціна
- Тільки характеристики які РЕАЛЬНО відомі. Не вигадуй.

ПРАВИЛА ДЛЯ description_uk:
- 3-5 речень, конкретика
- НЕ починай з назви товару
- Посилання — <a href="/product/slug">Назва товару</a>
- ЗАБОРОНЕНО: [текст](url), [текст](/product/...), будь-який markdown`;

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const claudeData = await claudeRes.json();
  const text = claudeData.content?.[0]?.text;
  if (!text) return NextResponse.json({ error: 'Claude returned empty response' }, { status: 500 });

  const result = parseClaudeJSON<{
    description_uk: string;
    specs: Record<string, { value: string; source: string }>;
    season_tags: string[];
    style_tags: string[];
    compatible_slugs: string[];
  }>(text);

  // Collect all photos from sources
  const allPhotos = parsedSources.flatMap(s =>
    s.data.photos.map(url => ({ url, source: 'parsed', from: s.name })),
  );

  // Estimate cost (rough)
  const inputTokens = prompt.length / 4;
  const outputTokens = text.length / 4;
  const costUsd = (inputTokens * 1 + outputTokens * 5) / 1_000_000;

  return NextResponse.json({
    ...result,
    photos: allPhotos,
    source_matches: sourceMatches,
    sources_used: parsedSources.map(s => s.name),
    cost_usd: Math.round(costUsd * 10000) / 10000,
  });
}
