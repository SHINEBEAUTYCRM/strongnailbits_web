// ================================================================
//  Strong Nail Bits B2B — AI Enrichment (Claude)
//  Generates Ukrainian descriptions, tags, compatibility
//  Rule: if field.edited === true && field.source === 'manual' → DO NOT overwrite
// ================================================================

import { enrichProduct as claudeEnrichProduct } from '@/lib/claude';
import type { AIMetadata, EnrichmentProduct, EnrichmentBrand, RawParsedData } from './types';

/**
 * Enrich a product with AI-generated metadata.
 * Respects manual edits — will NOT overwrite fields where edited=true && source='manual'.
 */
export async function enrichProductWithAI(
  product: EnrichmentProduct,
  brand: EnrichmentBrand,
  rawParsedData: RawParsedData | null,
): Promise<{
  updatedMetadata: AIMetadata;
  tokens: { input: number; output: number };
  fieldsUpdated: string[];
  fieldsSkipped: string[];
}> {
  const existingMetadata = product.ai_metadata || {};
  const fieldsSkipped: string[] = [];
  const fieldsUpdated: string[] = [];

  // Call Claude enrichment
  const { metadata: newFields, tokens } = await claudeEnrichProduct(
    {
      name_uk: product.name_uk,
      sku: product.sku,
      description_uk: product.description_uk,
      description_ru: product.description_ru,
      category_name: product.category_name,
    },
    brand.brand_knowledge || {},
    rawParsedData ? {
      title: rawParsedData.title,
      description: rawParsedData.description,
      specs: rawParsedData.specs,
      composition: rawParsedData.composition,
      instructions: rawParsedData.instructions,
    } : null,
  );

  // Merge: respect manual edits
  const mergedMetadata: AIMetadata = { ...existingMetadata } as AIMetadata;

  const fieldKeys = Object.keys(newFields) as (keyof AIMetadata)[];

  for (const key of fieldKeys) {
    const existing = existingMetadata[key as keyof typeof existingMetadata] as AIMetadata[keyof AIMetadata] | undefined;
    const newField = newFields[key];

    if (!newField) continue;

    // Rule: if edited=true and source='manual' — don't overwrite
    if (existing && typeof existing === 'object' && 'edited' in existing && 'source' in existing) {
      if (existing.edited === true && existing.source === 'manual') {
        fieldsSkipped.push(key);
        continue;
      }
    }

    // Set the new field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mergedMetadata as any)[key] = newField;
    fieldsUpdated.push(key);
  }

  return {
    updatedMetadata: mergedMetadata,
    tokens,
    fieldsUpdated,
    fieldsSkipped,
  };
}

/**
 * Regenerate specific fields for a product.
 * Used when admin wants to re-run AI on specific fields.
 */
export async function regenerateFields(
  product: EnrichmentProduct,
  brand: EnrichmentBrand,
  fields: string[],
): Promise<{
  updatedMetadata: AIMetadata;
  tokens: { input: number; output: number };
}> {
  const rawParsedData = (product.raw_parsed_data && 'source_url' in product.raw_parsed_data)
    ? product.raw_parsed_data as RawParsedData
    : null;

  const { metadata: newFields, tokens } = await claudeEnrichProduct(
    {
      name_uk: product.name_uk,
      sku: product.sku,
      description_uk: product.description_uk,
      description_ru: product.description_ru,
      category_name: product.category_name,
    },
    brand.brand_knowledge || {},
    rawParsedData ? {
      title: rawParsedData.title,
      description: rawParsedData.description,
      specs: rawParsedData.specs,
      composition: rawParsedData.composition,
      instructions: rawParsedData.instructions,
    } : null,
  );

  // Only update requested fields
  const existingMetadata = { ...(product.ai_metadata || {}) } as AIMetadata;

  for (const field of fields) {
    const key = field as keyof AIMetadata;
    if (newFields[key]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (existingMetadata as any)[key] = newFields[key];
    }
  }

  return {
    updatedMetadata: existingMetadata,
    tokens,
  };
}
