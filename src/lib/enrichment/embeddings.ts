// ================================================================
//  Shine Shop B2B — Embeddings (pgvector)
//  Uses Voyage AI (Anthropic's recommended embedding provider)
//  Model: voyage-3-lite → vector(1024)
//  Auth: ANTHROPIC_API_KEY or VOYAGE_API_KEY
// ================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { getServiceField } from '@/lib/integrations/config-resolver';
import type { EnrichmentProduct, AIMetadata } from './types';

const VOYAGE_API = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-3-lite';
const EMBEDDING_DIMENSIONS = 1024;

async function getVoyageKey(): Promise<string> {
  // Try voyage-ai config first, then claude-api as fallback (Voyage accepts Anthropic keys)
  const voyageKey = await getServiceField('voyage-ai', 'api_key');
  if (voyageKey) return voyageKey;

  const claudeKey = await getServiceField('claude-api', 'api_key');
  if (claudeKey) return claudeKey;

  throw new Error('Missing Voyage AI / Anthropic API key for embeddings');
}

/**
 * Generate embedding for a product and save to DB.
 */
export async function generateAndSaveEmbedding(
  product: EnrichmentProduct,
  brandName?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const text = buildEmbeddingText(product, brandName);
    const embedding = await generateEmbedding(text);

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('products')
      .update({ embedding: JSON.stringify(embedding) })
      .eq('id', product.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Embedding generation failed',
    };
  }
}

/**
 * Generate embedding vector from text using Voyage AI.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = await getVoyageKey();

  const res = await fetch(VOYAGE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: [text],
      input_type: 'document',
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Voyage AI embeddings error: ${res.status} ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

/**
 * Build text for embedding from product data.
 * Combines: name, brand, category, description, color, finish, tags
 */
function buildEmbeddingText(product: EnrichmentProduct, brandName?: string): string {
  const metadata = product.ai_metadata as AIMetadata | undefined;
  const parts: string[] = [];

  // Name
  parts.push(product.name_uk);
  if (product.name_ru) parts.push(product.name_ru);

  // Brand
  if (brandName) parts.push(brandName);
  if (product.brand?.name) parts.push(product.brand.name);

  // Category
  if (product.category_name) parts.push(product.category_name);

  // SKU
  if (product.sku) parts.push(product.sku);

  // AI description
  if (metadata?.description_uk?.value) {
    parts.push(metadata.description_uk.value);
  } else if (product.description_uk) {
    parts.push(product.description_uk);
  }

  // Color
  if (metadata?.color_family?.value) parts.push(metadata.color_family.value);

  // Finish
  if (metadata?.finish?.value) parts.push(metadata.finish.value);

  // Season tags
  if (metadata?.season_tags?.value?.length) {
    parts.push(metadata.season_tags.value.join(', '));
  }

  // Style tags
  if (metadata?.style_tags?.value?.length) {
    parts.push(metadata.style_tags.value.join(', '));
  }

  // Compatible
  if (metadata?.compatible_with?.value?.length) {
    parts.push(`Сумісний з: ${metadata.compatible_with.value.join(', ')}`);
  }

  return parts.filter(Boolean).join(' ').slice(0, 8000);
}

/**
 * Batch generate embeddings for multiple products.
 * Voyage AI supports batch of up to 128 inputs.
 */
export async function batchGenerateEmbeddings(
  products: EnrichmentProduct[],
  brandNames: Map<string, string>,
): Promise<{ success: number; errors: number }> {
  const supabase = createAdminClient();
  let success = 0;
  let errors = 0;

  const batchSize = 128;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const texts = batch.map(p => buildEmbeddingText(p, brandNames.get(p.brand_id || '')));

    try {
      const apiKey = await getVoyageKey();

      const res = await fetch(VOYAGE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: VOYAGE_MODEL,
          input: texts,
          input_type: 'document',
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        throw new Error(`Voyage AI batch embeddings error: ${res.status}`);
      }

      const data = await res.json();
      const embeddings = data.data.map((d: { embedding: number[] }) => d.embedding);

      // Save to DB
      for (let j = 0; j < batch.length; j++) {
        const { error } = await supabase
          .from('products')
          .update({ embedding: JSON.stringify(embeddings[j]) })
          .eq('id', batch[j].id);

        if (error) {
          errors++;
          console.error(`[Embeddings] Save failed for ${batch[j].id}:`, error.message);
        } else {
          success++;
        }
      }
    } catch (err) {
      errors += batch.length;
      console.error(`[Embeddings] Batch failed:`, err);
    }
  }

  return { success, errors };
}
