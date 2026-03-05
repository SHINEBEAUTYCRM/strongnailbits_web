// ================================================================
//  Strong Nail Bits B2B — AI Vision (Claude Vision)
//  Analyzes product photos: color, finish, density
//  Only for color products (gel polish, gel paint, etc.)
//  Skip for: bits, liquids, furniture
// ================================================================

import { analyzeProductPhoto } from '@/lib/claude';
import { downloadPhotoAsBase64 } from './photo-downloader';
import type { AIMetadata, VisionAnalysisResult, FieldWithSource } from './types';

// Categories that should be analyzed by vision
const COLOR_CATEGORY_KEYWORDS = [
  'гель-лак', 'gel-lak', 'gel polish',
  'гель-фарба', 'gel-farba', 'gel paint',
  'лак', 'polish',
  'гель', 'gel',
  'топ', 'top',
  'база', 'base',
  'rubber base',
  'акригель', 'acrygel',
  'полігель', 'polygel',
];

const SKIP_CATEGORY_KEYWORDS = [
  'фреза', 'bit', 'cutter',
  'рідина', 'liquid', 'remover', 'cleanser',
  'пилка', 'file', 'buff',
  'меблі', 'furniture',
  'лампа', 'lamp',
  'кисть', 'brush',
  'серветка', 'wipe',
  'форма', 'form',
  'типс', 'tip',
];

/**
 * Check if product should be analyzed by Vision.
 */
export function shouldAnalyzeWithVision(
  product: { name_uk: string; category_name?: string },
): boolean {
  const name = product.name_uk.toLowerCase();
  const category = (product.category_name || '').toLowerCase();
  const text = `${name} ${category}`;

  // Skip if matches skip keywords
  for (const kw of SKIP_CATEGORY_KEYWORDS) {
    if (text.includes(kw)) return false;
  }

  // Analyze if matches color keywords
  for (const kw of COLOR_CATEGORY_KEYWORDS) {
    if (text.includes(kw)) return true;
  }

  return false;
}

/**
 * Analyze product photo with Claude Vision.
 * Returns color_hex, color_family, finish, density with source: 'vision'
 */
export async function analyzeWithVision(
  imageUrl: string,
): Promise<{
  visionFields: Partial<AIMetadata>;
  rawResult: VisionAnalysisResult;
  tokens: { input: number; output: number };
}> {
  // Download image as base64
  const { base64, mediaType } = await downloadPhotoAsBase64(imageUrl);

  // Analyze with Claude Vision
  const { result, tokens } = await analyzeProductPhoto(base64, mediaType);

  // Convert to AIMetadata fields with source: 'vision'
  const visionFields: Partial<AIMetadata> = {};

  if (result.color_hex) {
    visionFields.color_hex = {
      value: result.color_hex,
      source: 'vision',
      edited: false,
    } as FieldWithSource;
  }

  if (result.color_family) {
    visionFields.color_family = {
      value: result.color_family,
      source: 'vision',
      edited: false,
    } as FieldWithSource;
  }

  if (result.finish) {
    visionFields.finish = {
      value: result.finish,
      source: 'vision',
      edited: false,
    } as FieldWithSource;
  }

  if (result.density) {
    visionFields.density = {
      value: result.density,
      source: 'vision',
      edited: false,
    } as FieldWithSource;
  }

  return { visionFields, rawResult: result, tokens };
}
