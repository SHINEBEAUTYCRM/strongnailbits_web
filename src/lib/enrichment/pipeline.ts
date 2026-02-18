// ================================================================
//  Shine Shop B2B — Enrichment Pipeline Orchestrator
//  Processes products in batches with rate limiting
//  Batch: 10 parallel, Rate limit: 50 req/min to Claude
//  Each operation → enrichment_log
//  Error in one product doesn't stop pipeline
// ================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { parseProductPage, findProductPage } from './parser';
import { downloadAndUploadPhotos } from './photo-downloader';
import { shouldAnalyzeWithVision, analyzeWithVision } from './ai-vision';
import { enrichProductWithAI } from './ai-enrichment';
import { generateAndSaveEmbedding } from './embeddings';
import type {
  PipelineConfig,
  PipelineProgress,
  EnrichmentProduct,
  EnrichmentBrand,
  RawParsedData,
  PhotoSource,
  AIMetadata,
} from './types';

const BATCH_SIZE = 10;
const RATE_LIMIT_DELAY = 1200; // ms between Claude requests (~50/min)

// ────── Main Pipeline ──────

export async function* runPipeline(
  config: PipelineConfig,
): AsyncGenerator<PipelineProgress> {
  const supabase = createAdminClient();
  const startedAt = new Date().toISOString();

  // Get products by filter — paginate to bypass Supabase 1000 row limit
  const PAGE_SIZE = 1000;
  const rawProducts: Record<string, unknown>[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('products')
      .select('*, brands!brand_id(id, name, slug, logo_url, photo_source_url, photo_source_type, info_source_url, parse_config, brand_knowledge, total_products, products_with_photo, products_enriched, products_approved, last_parsed_at, last_enriched_at), categories!category_id(name_uk)')
      .order('name_uk')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (config.brand_id) {
      query = query.eq('brand_id', config.brand_id);
    }

    switch (config.scope) {
      case 'missing':
        query = query.eq('enrichment_status', 'pending');
        break;
      case 'outdated':
        query = query.in('enrichment_status', ['pending', 'enriched']);
        break;
      case 'errors':
        query = query.eq('enrichment_status', 'error');
        break;
      case 'all':
        break;
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`);
    }

    if (data && data.length > 0) {
      rawProducts.push(...data);
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
    page++;
  }

  if (!rawProducts || rawProducts.length === 0) {
    yield {
      step: 0,
      step_name: 'Завершено',
      total: 0,
      processed: 0,
      errors: 0,
      started_at: startedAt,
    };
    return;
  }

  // Map products with joined data
  const products: EnrichmentProduct[] = rawProducts.map((p: Record<string, unknown>) => ({
    ...p,
    brand: (p.brands as EnrichmentBrand) || undefined,
    category_name: (p.categories as { name_uk: string } | null)?.name_uk || undefined,
    ai_metadata: (p.ai_metadata || {}) as AIMetadata,
    raw_parsed_data: (p.raw_parsed_data || {}) as RawParsedData | Record<string, never>,
    photo_sources: (p.photo_sources || []) as PhotoSource[],
  })) as EnrichmentProduct[];

  const total = products.length;
  let processed = 0;
  let errors = 0;

  // Load brands map
  const brandsMap = new Map<string, EnrichmentBrand>();
  for (const p of products) {
    if (p.brand && !brandsMap.has(p.brand.id)) {
      brandsMap.set(p.brand.id, p.brand);
    }
  }

  // ── Step 1: Parsing ──
  if (config.steps.parse) {
    processed = 0;
    errors = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (product) => {
          try {
            if (!product.brand?.parse_config?.selectors) {
              processed++;
              return;
            }

            // Find product page
            const pageUrl = await findProductPage(product.brand, product);
            if (!pageUrl) {
              await logAction(supabase, product.brand_id, product.id, 'parse', 'skipped', {
                reason: 'Product page not found',
              });
              processed++;
              return;
            }

            // Parse
            const parsed = await parseProductPage(
              pageUrl,
              product.brand.parse_config.selectors,
              product.brand.parse_config.parse_options,
            );

            // Save raw parsed data
            await supabase
              .from('products')
              .update({
                raw_parsed_data: parsed,
                enrichment_status: 'parsing',
              })
              .eq('id', product.id);

            // Update local reference
            product.raw_parsed_data = parsed;

            await logAction(supabase, product.brand_id, product.id, 'parse', 'success', {
              source_url: pageUrl,
              fields_found: Object.keys(parsed).filter(k => k !== 'source_url' && k !== 'parsed_at'),
            });

            processed++;
          } catch (err) {
            errors++;
            processed++;
            await logAction(supabase, product.brand_id, product.id, 'parse', 'error', {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }),
      );

      yield {
        step: 1,
        step_name: 'Парсинг',
        total,
        processed,
        errors,
        started_at: startedAt,
      };
    }
  }

  // ── Step 2: Photos ──
  if (config.steps.download_photos) {
    processed = 0;
    errors = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (product) => {
          try {
            const parsedData = product.raw_parsed_data as RawParsedData;
            if (!parsedData?.photo_urls?.length) {
              processed++;
              return;
            }

            const brandSlug = product.brand?.slug || 'unknown';
            const photoSources = await downloadAndUploadPhotos(
              { slug: product.slug, brand_slug: brandSlug },
              parsedData.photo_urls,
              product.brand?.photo_source_url || 'brand_website',
            );

            if (photoSources.length > 0) {
              // Merge with existing CS-Cart photos
              const existingPhotos = (product.photo_sources || []).filter(
                (p: PhotoSource) => p.source === 'cs_cart' || p.source === 'manual',
              );

              const allPhotos = [...photoSources, ...existingPhotos];

              await supabase
                .from('products')
                .update({
                  photo_sources: allPhotos,
                  main_image_url: photoSources[0]?.url || product.main_image_url,
                })
                .eq('id', product.id);

              product.photo_sources = allPhotos;

              await logAction(supabase, product.brand_id, product.id, 'photos', 'success', {
                downloaded: photoSources.length,
                total: allPhotos.length,
              });
            }

            processed++;
          } catch (err) {
            errors++;
            processed++;
            await logAction(supabase, product.brand_id, product.id, 'photos', 'error', {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }),
      );

      yield {
        step: 2,
        step_name: 'Фото',
        total,
        processed,
        errors,
        started_at: startedAt,
      };
    }
  }

  // ── Step 3: Vision ──
  if (config.steps.ai_vision) {
    processed = 0;
    errors = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);

      // Sequential for rate limiting
      for (const product of batch) {
        try {
          if (!shouldAnalyzeWithVision(product)) {
            processed++;
            continue;
          }

          // Get best photo URL for analysis
          const photoUrl = getBestPhotoForVision(product);
          if (!photoUrl) {
            processed++;
            continue;
          }

          const { visionFields, tokens } = await analyzeWithVision(photoUrl);

          // Merge vision fields with existing metadata
          const currentMetadata = (product.ai_metadata || {}) as AIMetadata;
          const merged = { ...currentMetadata };

          for (const [key, value] of Object.entries(visionFields)) {
            const k = key as keyof AIMetadata;
            const existing = currentMetadata[k];
            // Don't overwrite manual edits
            if (existing && typeof existing === 'object' && 'edited' in existing && existing.edited && existing.source === 'manual') {
              continue;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (merged as any)[k] = value;
          }

          await supabase
            .from('products')
            .update({ ai_metadata: merged })
            .eq('id', product.id);

          product.ai_metadata = merged;

          await logAction(supabase, product.brand_id, product.id, 'vision', 'success', {
            fields: Object.keys(visionFields),
            tokens,
          });

          processed++;

          // Rate limit
          await sleep(RATE_LIMIT_DELAY);
        } catch (err) {
          errors++;
          processed++;
          await logAction(supabase, product.brand_id, product.id, 'vision', 'error', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      yield {
        step: 3,
        step_name: 'Vision',
        total,
        processed,
        errors,
        started_at: startedAt,
      };
    }
  }

  // ── Step 4: AI Enrichment ──
  if (config.steps.ai_enrichment) {
    processed = 0;
    errors = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);

      // Sequential for rate limiting
      for (const product of batch) {
        try {
          if (!product.brand) {
            processed++;
            continue;
          }

          const rawData = (product.raw_parsed_data && 'source_url' in product.raw_parsed_data)
            ? product.raw_parsed_data as RawParsedData
            : null;

          const { updatedMetadata, tokens, fieldsUpdated, fieldsSkipped } =
            await enrichProductWithAI(product, product.brand, rawData);

          await supabase
            .from('products')
            .update({
              ai_metadata: updatedMetadata,
              enrichment_status: 'enriched',
              enrichment_source: 'ai',
              enrichment_date: new Date().toISOString(),
              enriched_by: 'pipeline',
            })
            .eq('id', product.id);

          product.ai_metadata = updatedMetadata;
          product.enrichment_status = 'enriched';

          await logAction(supabase, product.brand_id, product.id, 'enrichment', 'success', {
            fields_updated: fieldsUpdated,
            fields_skipped: fieldsSkipped,
            tokens,
          });

          processed++;

          // Rate limit
          await sleep(RATE_LIMIT_DELAY);
        } catch (err) {
          errors++;
          processed++;

          await supabase
            .from('products')
            .update({ enrichment_status: 'error' })
            .eq('id', product.id);

          await logAction(supabase, product.brand_id, product.id, 'enrichment', 'error', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      yield {
        step: 4,
        step_name: 'AI Enrichment',
        total,
        processed,
        errors,
        started_at: startedAt,
      };
    }
  }

  // ── Step 5: Embeddings ──
  if (config.steps.embeddings) {
    processed = 0;
    errors = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (product) => {
          try {
            const brandName = product.brand?.name;
            const result = await generateAndSaveEmbedding(product, brandName);

            if (result.success) {
              await logAction(supabase, product.brand_id, product.id, 'embedding', 'success', {});
            } else {
              errors++;
              await logAction(supabase, product.brand_id, product.id, 'embedding', 'error', {
                error: result.error,
              });
            }

            processed++;
          } catch (err) {
            errors++;
            processed++;
            await logAction(supabase, product.brand_id, product.id, 'embedding', 'error', {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }),
      );

      yield {
        step: 5,
        step_name: 'Embeddings',
        total,
        processed,
        errors,
        started_at: startedAt,
      };
    }
  }

  // ── Update brand stats ──
  await updateBrandStats(supabase, config.brand_id);

  yield {
    step: 6,
    step_name: 'Завершено',
    total,
    processed: total,
    errors,
    started_at: startedAt,
  };
}

// ────── Helpers ──────

function getBestPhotoForVision(product: EnrichmentProduct): string | null {
  // Prefer parsed photos, then CS-Cart
  const photos = product.photo_sources || [];

  const parsed = photos.find(p => p.source === 'parsed');
  if (parsed) return parsed.url;

  const cscart = photos.find(p => p.source === 'cs_cart');
  if (cscart) return cscart.url;

  // Fallback to main_image_url
  return product.main_image_url || null;
}

async function logAction(
  supabase: ReturnType<typeof createAdminClient>,
  brandId: string | null,
  productId: string,
  action: string,
  status: string,
  details: Record<string, unknown>,
) {
  try {
    await supabase.from('enrichment_log').insert({
      brand_id: brandId,
      product_id: productId,
      action,
      status,
      details,
    });
  } catch (err) {
    console.error('[Pipeline] Failed to log action:', err);
  }
}

async function updateBrandStats(
  supabase: ReturnType<typeof createAdminClient>,
  brandId?: string,
) {
  try {
    // Get brands to update
    let brandIds: string[];

    if (brandId) {
      brandIds = [brandId];
    } else {
      const { data } = await supabase.from('brands').select('id');
      brandIds = (data || []).map((b: { id: string }) => b.id);
    }

    for (const id of brandIds) {
      const { data: stats } = await supabase
        .from('products')
        .select('enrichment_status, photo_sources')
        .eq('brand_id', id);

      if (!stats) continue;

      const total = stats.length;
      const withPhoto = stats.filter((p: { photo_sources: PhotoSource[] }) =>
        p.photo_sources && Array.isArray(p.photo_sources) && p.photo_sources.length > 0,
      ).length;
      const enriched = stats.filter((p: { enrichment_status: string }) =>
        ['enriched', 'approved'].includes(p.enrichment_status),
      ).length;
      const approved = stats.filter((p: { enrichment_status: string }) =>
        p.enrichment_status === 'approved',
      ).length;

      await supabase
        .from('brands')
        .update({
          total_products: total,
          products_with_photo: withPhoto,
          products_enriched: enriched,
          products_approved: approved,
          last_enriched_at: new Date().toISOString(),
        })
        .eq('id', id);
    }
  } catch (err) {
    console.error('[Pipeline] Failed to update brand stats:', err);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
