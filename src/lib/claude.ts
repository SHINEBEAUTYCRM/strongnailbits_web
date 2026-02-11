// ================================================================
//  Shine Shop B2B — Claude API Client for Enrichment Pipeline
//  Models:
//    claude-haiku-4-5-20251001 — enrichment (fast, cheap)
//    claude-sonnet-4-5-20250929 — auto-detect, complex tasks
// ================================================================

import type { AIMetadata, VisionAnalysisResult } from './enrichment/types';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ENRICHMENT_MODEL = 'claude-haiku-4-5-20251001';
const SMART_MODEL = 'claude-sonnet-4-5-20250929';

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!key) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable');
  }
  return key;
}

// ────── Core API call ──────

interface ClaudeRequestOptions {
  model?: string;
  system?: string;
  messages: { role: 'user' | 'assistant'; content: string | ClaudeContentBlock[] }[];
  maxTokens?: number;
  temperature?: number;
}

interface ClaudeContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

interface ClaudeApiResponse {
  success: boolean;
  text: string;
  inputTokens: number;
  outputTokens: number;
  error?: string;
}

async function callClaude(options: ClaudeRequestOptions): Promise<ClaudeApiResponse> {
  const apiKey = getApiKey();
  const model = options.model || ENRICHMENT_MODEL;

  const body: Record<string, unknown> = {
    model,
    max_tokens: options.maxTokens || 2048,
    messages: options.messages,
  };

  if (options.system) {
    body.system = options.system;
  }
  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    const data = await res.json();

    if (data.error) {
      return {
        success: false,
        text: '',
        inputTokens: 0,
        outputTokens: 0,
        error: data.error.message || 'Claude API error',
      };
    }

    const text = data.content?.find((c: { type: string }) => c.type === 'text')?.text || '';

    return {
      success: true,
      text,
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    };
  } catch (err) {
    return {
      success: false,
      text: '',
      inputTokens: 0,
      outputTokens: 0,
      error: err instanceof Error ? err.message : 'Claude request failed',
    };
  }
}

// ────── Enrichment: описание, теги, совместимость ──────

export async function enrichProduct(
  product: { name_uk: string; sku?: string | null; description_uk?: string | null; description_ru?: string | null; category_name?: string },
  brandKnowledge: Record<string, unknown>,
  rawParsedData: { title?: string; description?: string; specs?: Record<string, string>; composition?: string; instructions?: string } | null,
): Promise<{ metadata: Partial<AIMetadata>; tokens: { input: number; output: number } }> {
  const systemPrompt = `Ти — експерт nail-індустрії та копірайтер для SHINE SHOP (shineshopb2b.com).
Задача: створити опис товару УКРАЇНСЬКОЮ на основі наданих даних.

Бренд знання: ${JSON.stringify(brandKnowledge)}

Правила:
1. Опис українською, професійний але зрозумілий
2. Використовуй РЕАЛЬНІ дані, НЕ вигадуй характеристики
3. Якщо даних немає — пропусти поле (не додавай null)
4. Теги сезонності: ["весна", "літо", "осінь", "зима", "універсальний"]
5. Теги стилю: ["класика", "тренд", "мінімалізм", "арт", "святковий", "офіс", "повсякденний"]
6. Сумісність — товари того ж бренду + відомі сумісні бренди

Поверни ТІЛЬКИ JSON без markdown. Формат:
{
  "description_uk": "опис українською",
  "season_tags": ["тег1", "тег2"],
  "style_tags": ["тег1", "тег2"],
  "compatible_with": ["бренд1", "бренд2"],
  "skill_level": "початківець|майстер|професіонал",
  "application_tips": "поради щодо нанесення",
  "color_family": "назва кольору (якщо є)",
  "finish": "глянець|матовий|шимер|гліттер|хамелеон (якщо є)",
  "volume_ml": число (якщо є),
  "curing": "час полімеризації (якщо є)",
  "composition": "склад (якщо є)"
}`;

  const userContent = `Товар: ${product.name_uk}
Артикул: ${product.sku || 'немає'}
Категорія: ${product.category_name || 'немає'}
Поточний опис (UA): ${product.description_uk || 'немає'}
Поточний опис (RU): ${product.description_ru || 'немає'}

${rawParsedData ? `Дані з сайту бренду:
Назва: ${rawParsedData.title || 'немає'}
Опис: ${rawParsedData.description || 'немає'}
Характеристики: ${rawParsedData.specs ? JSON.stringify(rawParsedData.specs) : 'немає'}
Склад: ${rawParsedData.composition || 'немає'}
Інструкція: ${rawParsedData.instructions || 'немає'}` : 'Дані з сайту бренду: відсутні'}`;

  const result = await callClaude({
    model: ENRICHMENT_MODEL,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
    maxTokens: 2048,
    temperature: 0.3,
  });

  if (!result.success) {
    throw new Error(`Claude enrichment failed: ${result.error}`);
  }

  try {
    const parsed = extractJSON(result.text);

    const metadata: Partial<AIMetadata> = {};

    if (parsed.description_uk) {
      metadata.description_uk = {
        value: String(parsed.description_uk),
        source: 'ai',
        edited: false,
        original_text: rawParsedData?.description,
        original_source: rawParsedData ? 'brand_website' : undefined,
      };
    }
    if (parsed.color_family) {
      metadata.color_family = { value: String(parsed.color_family), source: 'ai', edited: false };
    }
    if (parsed.finish) {
      metadata.finish = { value: String(parsed.finish), source: 'ai', edited: false };
    }
    if (parsed.density) {
      metadata.density = { value: String(parsed.density), source: 'ai', edited: false };
    }
    if (parsed.volume_ml) {
      metadata.volume_ml = { value: Number(parsed.volume_ml), source: 'ai', edited: false };
    }
    if (parsed.curing) {
      metadata.curing = { value: String(parsed.curing), source: 'ai', edited: false };
    }
    if (parsed.composition) {
      metadata.composition = { value: String(parsed.composition), source: 'ai', edited: false };
    }
    if (Array.isArray(parsed.season_tags) && parsed.season_tags.length) {
      metadata.season_tags = { value: parsed.season_tags as string[], source: 'ai', edited: false };
    }
    if (Array.isArray(parsed.style_tags) && parsed.style_tags.length) {
      metadata.style_tags = { value: parsed.style_tags as string[], source: 'ai', edited: false };
    }
    if (Array.isArray(parsed.compatible_with) && parsed.compatible_with.length) {
      metadata.compatible_with = { value: parsed.compatible_with as string[], source: 'ai', edited: false };
    }
    if (parsed.skill_level) {
      metadata.skill_level = { value: String(parsed.skill_level), source: 'ai', edited: false };
    }
    if (parsed.application_tips) {
      metadata.application_tips = { value: String(parsed.application_tips), source: 'ai', edited: false };
    }

    return {
      metadata,
      tokens: { input: result.inputTokens, output: result.outputTokens },
    };
  } catch {
    throw new Error(`Failed to parse Claude enrichment response: ${result.text.slice(0, 200)}`);
  }
}

// ────── Vision: анализ фото ──────

export async function analyzeProductPhoto(
  imageBase64: string,
  mediaType: string = 'image/jpeg',
): Promise<{ result: VisionAnalysisResult; tokens: { input: number; output: number } }> {
  const systemPrompt = `Ти — експерт з кольорів та текстур nail-індустрії.
Проаналізуй фото товару та визнач:
1. HEX-код основного кольору
2. Колірна сім'я (бордо, рожевий, червоний, бежевий, нюд, білий, чорний, синій, зелений, фіолетовий, жовтий, оранжевий, сірий, коричневий, золото, срібло, голографік, мульти)
3. Фініш (глянець, матовий, шимер, гліттер, хамелеон, кришталевий, котяче око, фольга, втирка)
4. Щільність (повна, напівпрозора, прозора, желе)

Поверни ТІЛЬКИ JSON:
{
  "color_hex": "#XXXXXX",
  "color_family": "назва",
  "finish": "назва",
  "density": "назва"
}
Якщо не можеш визначити якесь поле — постав null.`;

  const result = await callClaude({
    model: ENRICHMENT_MODEL,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: imageBase64,
          },
        },
        {
          type: 'text',
          text: 'Проаналізуй цей товар для nail-індустрії.',
        },
      ],
    }],
    maxTokens: 512,
    temperature: 0.1,
  });

  if (!result.success) {
    throw new Error(`Claude Vision failed: ${result.error}`);
  }

  try {
    const parsed = extractJSON(result.text);

    return {
      result: {
        color_hex: (parsed.color_hex as string) || null,
        color_family: (parsed.color_family as string) || null,
        finish: (parsed.finish as string) || null,
        density: (parsed.density as string) || null,
      },
      tokens: { input: result.inputTokens, output: result.outputTokens },
    };
  } catch {
    throw new Error(`Failed to parse Claude Vision response: ${result.text.slice(0, 200)}`);
  }
}

// ────── Auto-detect: CSS-селекторы ──────

export async function autoDetectSelectors(
  htmlSample: string,
  pageUrl: string,
): Promise<{
  selectors: {
    title?: string;
    description?: string;
    photo?: string;
    specs?: string;
    composition?: string;
    instructions?: string;
  };
  confidence: number;
  tokens: { input: number; output: number };
}> {
  const systemPrompt = `Ти — експерт з веб-скрейпінгу та CSS-селекторів.
Проаналізуй HTML-сторінку товару та знайди CSS-селектори для:
1. title — назва товару (зазвичай h1 або .product-title)
2. description — опис товару (блок тексту з описом)
3. photo — фотографії товару (img всередині product gallery/slider)
4. specs — таблиця характеристик (dl, table або .specs)
5. composition — склад (якщо є окремий блок)
6. instructions — інструкція з використання (якщо є)

ВАЖЛИВО:
- Шукай реальні CSS-селектори що є в цьому HTML
- Перевіряй що елемент за селектором реально існує в наданому HTML
- Якщо бачиш конкретні class-атрибути — використовуй їх
- Якщо блок не знайдений, постав null
- Для фото шукай img в контейнері галереї/слайдера, а не логотипи чи іконки

Поверни ТІЛЬКИ чистий JSON без markdown-обгортки:
{
  "selectors": {
    "title": "CSS selector або null",
    "description": "CSS selector або null",
    "photo": "CSS selector або null",
    "specs": "CSS selector або null",
    "composition": "CSS selector або null",
    "instructions": "CSS selector або null"
  },
  "confidence": число від 0 до 1,
  "notes": "коротке пояснення що знайшов"
}`;

  // Trim HTML to avoid token limits — keep meaningful parts
  const trimmedHtml = trimHtmlSmart(htmlSample, 15000);

  const result = await callClaude({
    model: SMART_MODEL,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `URL сторінки товару: ${pageUrl}\n\nHTML:\n${trimmedHtml}`,
    }],
    maxTokens: 1024,
    temperature: 0.1,
  });

  if (!result.success) {
    throw new Error(`Claude auto-detect failed: ${result.error}`);
  }

  try {
    const parsed = extractJSON(result.text);

    // Filter out null selectors
    const selectors: Record<string, string> = {};
    if (parsed.selectors && typeof parsed.selectors === 'object') {
      for (const [key, val] of Object.entries(parsed.selectors as Record<string, unknown>)) {
        if (val && typeof val === 'string' && val !== 'null') {
          selectors[key] = val;
        }
      }
    }

    // Warn if all selectors are empty
    if (Object.keys(selectors).length === 0) {
      throw new Error(
        `Claude не знайшов жодного CSS-селектора на сторінці ${pageUrl}. ` +
        `Можливо, це не сторінка товару, або сайт використовує JavaScript-рендеринг (SPA). ` +
        (parsed.notes ? `Примітка Claude: ${String(parsed.notes)}` : ''),
      );
    }

    return {
      selectors,
      confidence: Number(parsed.confidence) || 0,
      tokens: { input: result.inputTokens, output: result.outputTokens },
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('не знайшов')) {
      throw err; // Re-throw our custom error
    }
    throw new Error(`Failed to parse auto-detect response: ${result.text.slice(0, 300)}`);
  }
}

/**
 * Extract JSON from Claude response, handling markdown code fences and other wrappers.
 */
function extractJSON(text: string): Record<string, unknown> {
  // Try direct parse first
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch { /* continue */ }

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* continue */ }
  }

  // Find first { ... last }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)); } catch { /* continue */ }
  }

  throw new Error('No valid JSON found');
}

/**
 * Smart HTML trim — remove scripts, styles, SVGs and keep meaningful content.
 */
function trimHtmlSmart(html: string, maxLen: number): string {
  let cleaned = html
    // Remove scripts, styles, SVGs, comments
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove data-URIs (they're huge)
    .replace(/data:[^"'\s]+/g, 'data:...')
    // Collapse whitespace
    .replace(/\s{3,}/g, '\n');

  if (cleaned.length > maxLen) {
    cleaned = cleaned.slice(0, maxLen) + '\n<!-- trimmed -->';
  }
  return cleaned;
}

// ────── Translate to Ukrainian ──────

export async function translateToUkrainian(text: string): Promise<string> {
  const result = await callClaude({
    model: ENRICHMENT_MODEL,
    system: 'Перекладай текст українською. Поверни ТІЛЬКИ переклад, без пояснень.',
    messages: [{ role: 'user', content: text }],
    maxTokens: 2048,
    temperature: 0.2,
  });

  if (!result.success) {
    throw new Error(`Translation failed: ${result.error}`);
  }

  return result.text.trim();
}
