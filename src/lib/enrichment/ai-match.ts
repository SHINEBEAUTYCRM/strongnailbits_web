import { parseClaudeJSON } from '@/lib/parse-claude-json';
import type { Candidate, FoundProduct } from './find-product-on-site';

interface OurProduct {
  code: string;
  name: string;
  volume?: string;
  brand?: string;
}

export async function aiMatchProduct(
  our: OurProduct,
  candidates: Candidate[],
): Promise<FoundProduct | null> {
  if (candidates.length === 0) return null;

  const { getServiceField } = await import('@/lib/integrations/config-resolver');
  const apiKey = await getServiceField('claude-api', 'api_key');
  if (!apiKey) throw new Error('Claude API not configured');

  const candidateList = candidates.map((c, i) =>
    `${i + 1}. "${c.title}" ${c.price ? `(${c.price})` : ''} → ${c.url}`,
  ).join('\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Знайди серед кандидатів товар що відповідає нашому.

НАШ ТОВАР:
Артикул: ${our.code}
Назва: ${our.name}
${our.volume ? `Обʼєм: ${our.volume}` : ''}
${our.brand ? `Бренд: ${our.brand}` : ''}

КАНДИДАТИ:
${candidateList}

ПРАВИЛА ЗІСТАВЛЕННЯ:
- Артикул може відрізнятись: "DARK-028" = "028" = "GEL-028" = "dark028"
- Назва може бути іншою мовою або скороченою
- Обʼєм має збігатися якщо вказаний (15мл ≠ 30мл — це РІЗНІ товари)
- Бренд має збігатися
- Якщо кілька кандидатів підходять — обери з найточнішим збігом
- Якщо жоден не підходить — поверни null

Поверни ТІЛЬКИ JSON:
{
  "match_index": 1,
  "confidence": 0.95,
  "reason": "артикул 028 в назві, бренд DARK збігається, обʼєм 15мл збігається"
}
або
{ "match_index": null, "confidence": 0, "reason": "жоден кандидат не відповідає" }`,
      }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) return null;

  try {
    const result = parseClaudeJSON<{
      match_index: number | null;
      confidence: number;
      reason: string;
    }>(text);

    if (result.match_index === null || result.confidence < 0.6) return null;

    const matched = candidates[result.match_index - 1];
    if (!matched) return null;

    return {
      url: matched.url,
      title: matched.title,
      confidence: result.confidence,
      match_reason: result.reason,
    };
  } catch (err) {
    console.error('[Enrichment:AIMatch] Match failed:', err);
    return null;
  }
}
