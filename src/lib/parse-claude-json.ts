// ================================================================
//  Shine Shop B2B — Parse JSON from Claude responses
//  Handles markdown code fences, extra text, etc.
// ================================================================

/**
 * Парсит JSON из ответа Claude, обрабатывая:
 * - ```json ... ``` обёртку
 * - Лишний текст до/после JSON
 * - Невалидные завершения (обрезанный ответ)
 */
export function parseClaudeJSON<T = Record<string, unknown>>(text: string): T {
  const trimmed = text.trim();

  // 1. Прямой парсинг
  try { return JSON.parse(trimmed); } catch (err) { console.error('[ClaudeJSON] Direct parse failed:', err); }

  // 2. Убираем markdown code fences (```json ... ``` или ``` ... ```)
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch (err) { console.error('[ClaudeJSON] Code block parse failed:', err); }
  }

  // 3. Находим первый { и последний } — берём подстроку
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = trimmed.slice(firstBrace, lastBrace + 1);
    try { return JSON.parse(jsonCandidate); } catch (err) { console.error('[ClaudeJSON] Brace extract parse failed:', err); }
  }

  // 4. Попробуем найти [ ... ] (JSON array)
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const jsonCandidate = trimmed.slice(firstBracket, lastBracket + 1);
    try { return JSON.parse(jsonCandidate); } catch (err) { console.error('[ClaudeJSON] Bracket extract parse failed:', err); }
  }

  throw new Error(`Не вдалося розпарсити JSON з відповіді Claude: ${trimmed.slice(0, 200)}`);
}
