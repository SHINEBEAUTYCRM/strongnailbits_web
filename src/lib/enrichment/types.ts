// ================================================================
//  Shine Shop B2B — Enrichment Pipeline Types
// ================================================================

// ────── Источники и статусы ──────

export type EnrichmentSource = 'ai' | 'vision' | 'parsed' | 'cs_cart' | 'manual';

export type EnrichmentStatus =
  | 'pending'
  | 'parsing'
  | 'enriching'
  | 'enriched'
  | 'approved'
  | 'error';

// ────── Поле с source ──────

export interface FieldWithSource<T = string> {
  value: T;
  source: EnrichmentSource;
  edited: boolean;
  original_text?: string;
  original_source?: string;
}

// ────── AI Metadata ──────

export interface AIMetadata {
  description_uk?: FieldWithSource;
  color_family?: FieldWithSource;
  color_hex?: FieldWithSource;
  finish?: FieldWithSource;
  density?: FieldWithSource;
  volume_ml?: FieldWithSource<number>;
  curing?: FieldWithSource;
  composition?: FieldWithSource;
  season_tags?: FieldWithSource<string[]>;
  style_tags?: FieldWithSource<string[]>;
  compatible_with?: FieldWithSource<string[]>;
  skill_level?: FieldWithSource;
  application_tips?: FieldWithSource;
}

// ────── Photo Source ──────

export interface PhotoSource {
  url: string;
  source: EnrichmentSource;
  from?: string;
  type?: 'bottle' | 'swatch' | 'nails' | 'palette' | 'main';
}

// ────── Parse Config (brands.parse_config) ──────

export interface ParseConfig {
  product_url_pattern?: string;
  search_url_pattern?: string;
  selectors: {
    title?: string;
    description?: string;
    photo?: string;
    specs?: string;
    composition?: string;
    instructions?: string;
  };
  parse_options: {
    photos: boolean;
    description: boolean;
    specs: boolean;
    composition: boolean;
    instructions: boolean;
    palette: boolean;
    price_rrp: boolean;
  };
  auto_detected: boolean;
  detection_date?: string;
}

// ────── Raw Parsed Data (products.raw_parsed_data) ──────

export interface RawParsedData {
  source_url: string;
  parsed_at: string;
  title?: string;
  description?: string;
  specs?: Record<string, string>;
  composition?: string;
  instructions?: string;
  photo_urls?: string[];
}

// ────── Pipeline Config ──────

export interface PipelineConfig {
  brand_id?: string;
  scope: 'missing' | 'outdated' | 'errors' | 'all';
  steps: {
    parse: boolean;
    download_photos: boolean;
    ai_vision: boolean;
    ai_enrichment: boolean;
    embeddings: boolean;
  };
}

// ────── Pipeline Progress ──────

export interface PipelineProgress {
  step: number;
  step_name: string;
  total: number;
  processed: number;
  errors: number;
  started_at: string;
}

// ────── Brand (DB row extended) ──────

export interface EnrichmentBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  photo_source_url: string | null;
  photo_source_type: string;
  info_source_url: string | null;
  parse_config: ParseConfig;
  brand_knowledge: Record<string, unknown>;
  total_products: number;
  products_with_photo: number;
  products_enriched: number;
  products_approved: number;
  last_parsed_at: string | null;
  last_enriched_at: string | null;
}

// ────── Product (DB row extended for enrichment) ──────

export interface EnrichmentProduct {
  id: string;
  name_uk: string;
  name_ru: string | null;
  slug: string;
  sku: string | null;
  description_uk: string | null;
  description_ru: string | null;
  price: number;
  images: string[];
  main_image_url: string | null;
  brand_id: string | null;
  category_id: string | null;
  enrichment_source: EnrichmentSource;
  enrichment_status: EnrichmentStatus;
  enrichment_date: string | null;
  enriched_by: string | null;
  ai_metadata: AIMetadata;
  raw_parsed_data: RawParsedData | Record<string, never>;
  photo_sources: PhotoSource[];
  // Joined
  brand?: EnrichmentBrand;
  category_name?: string;
}

// ────── Enrichment Log Entry ──────

export interface EnrichmentLogEntry {
  id: string;
  brand_id: string | null;
  product_id: string | null;
  action: string;
  status: string;
  details: Record<string, unknown>;
  created_at: string;
}

// ────── Vision Analysis Result ──────

export interface VisionAnalysisResult {
  color_hex: string | null;
  color_family: string | null;
  finish: string | null;
  density: string | null;
}

// ────── Enrichment Stats ──────

export interface EnrichmentStats {
  total: number;
  with_photo: number;
  enriched: number;
  approved: number;
  pending: number;
  errors: number;
  by_brand: {
    brand_id: string;
    brand_name: string;
    brand_slug: string;
    total: number;
    enriched: number;
    approved: number;
    errors: number;
  }[];
}

// ────── Auto-detect Result ──────

export interface AutoDetectResult {
  selectors: ParseConfig['selectors'];
  sample_product_url: string;
  confidence: number;
}
