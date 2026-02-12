// ================================================================
//  ShineShop OS — PhotoRoom Client
//  Клієнтська бібліотека для взаємодії з PhotoRoom API через proxy
// ================================================================

import type { EditOptions, EditResult, BatchResult } from './types';

const EDIT_ENDPOINT = '/api/photoroom/edit';
const BATCH_ENDPOINT = '/api/photoroom/batch';

/** Безпечно витягує рядок помилки з JSON-відповіді proxy */
function extractErrorMsg(err: unknown, fallback: string): string {
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.error === 'object' && obj.error !== null) {
      return ((obj.error as Record<string, unknown>).message as string) || JSON.stringify(obj.error);
    }
    if (typeof obj.message === 'string') return obj.message;
  }
  return fallback;
}

/**
 * Формує FormData з EditOptions для відправки на серверний proxy.
 */
function buildFormData(options: EditOptions): FormData {
  const fd = new FormData();

  // Джерело зображення
  if (options.imageFile) {
    fd.append('imageFile', options.imageFile);
  } else if (options.imageUrl) {
    fd.append('imageUrl', options.imageUrl);
  }

  // Видалення фону
  if (options.removeBackground) {
    fd.append('background.remove', 'true');
  }

  // AI фон за промптом
  if (options.backgroundPrompt) {
    fd.append('background.prompt', options.backgroundPrompt);
  }

  // Розширення промпту
  if (options.backgroundPromptExpansion) {
    fd.append('background.prompt.expansion', options.backgroundPromptExpansion);
  }

  // Колір фону
  if (options.backgroundColorHex) {
    fd.append('background.color', options.backgroundColorHex);
  }

  // Тіні
  if (options.shadowMode) {
    fd.append('shadow.mode', options.shadowMode);
  }

  // Освітлення
  if (options.lightingMode) {
    fd.append('lighting.mode', options.lightingMode);
  }

  // Збільшення
  if (options.upscale) {
    fd.append('upscale', options.upscale);
  }

  // Видалення тексту
  if (options.textRemovalMode) {
    fd.append('text.removal.mode', options.textRemovalMode);
  }

  // Padding
  if (options.padding !== undefined) {
    fd.append('padding', options.padding.toString());
  }

  // Margin
  if (options.margin !== undefined) {
    fd.append('margin', options.margin.toString());
  }

  // Розмір
  if (options.outputWidth) {
    fd.append('outputSize.width', options.outputWidth.toString());
  }
  if (options.outputHeight) {
    fd.append('outputSize.height', options.outputHeight.toString());
  }

  return fd;
}

/**
 * Обробити одне зображення через PhotoRoom API.
 * Проксується через серверний endpoint.
 */
export async function editImage(options: EditOptions): Promise<EditResult> {
  const fd = buildFormData(options);

  const res = await fetch(EDIT_ENDPOINT, {
    method: 'POST',
    body: fd,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Невідома помилка PhotoRoom' }));
    throw new Error(extractErrorMsg(err, `PhotoRoom API помилка: ${res.status}`));
  }

  return res.json();
}

/**
 * Пакетна обробка зображень (до 10 штук).
 */
export async function batchEditImages(
  items: EditOptions[]
): Promise<BatchResult[]> {
  if (items.length === 0) return [];
  if (items.length > 10) {
    throw new Error('Максимум 10 зображень за раз');
  }

  // Серіалізуємо кожен EditOptions в base64 або URL
  const payload = items.map((item) => {
    const serialized: Record<string, string> = {};

    if (item.imageUrl) serialized.imageUrl = item.imageUrl;
    if (item.removeBackground) serialized['background.remove'] = 'true';
    if (item.backgroundPrompt) serialized['background.prompt'] = item.backgroundPrompt;
    if (item.backgroundPromptExpansion) serialized['background.prompt.expansion'] = item.backgroundPromptExpansion;
    if (item.backgroundColorHex) serialized['background.color'] = item.backgroundColorHex;
    if (item.shadowMode) serialized['shadow.mode'] = item.shadowMode;
    if (item.lightingMode) serialized['lighting.mode'] = item.lightingMode;
    if (item.upscale) serialized.upscale = item.upscale;
    if (item.textRemovalMode) serialized['text.removal.mode'] = item.textRemovalMode;
    if (item.padding !== undefined) serialized.padding = item.padding.toString();
    if (item.margin !== undefined) serialized.margin = item.margin.toString();
    if (item.outputWidth) serialized['outputSize.width'] = item.outputWidth.toString();
    if (item.outputHeight) serialized['outputSize.height'] = item.outputHeight.toString();

    return serialized;
  });

  const res = await fetch(BATCH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: payload }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Помилка пакетної обробки' }));
    throw new Error(extractErrorMsg(err, `Batch API помилка: ${res.status}`));
  }

  return res.json();
}
