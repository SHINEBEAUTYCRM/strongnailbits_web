/* ------------------------------------------------------------------ */
/*  Import / Export — TypeScript interfaces                          */
/* ------------------------------------------------------------------ */

/** Database fields available for mapping */
export const DB_FIELDS = [
  "name_uk",
  "sku",
  "price",
  "wholesale_price",
  "old_price",
  "quantity",
  "brand_name",
  "category_path",
  "description_uk",
  "weight",
  "volume",
  "barcode",
  "main_image_url",
  "meta_title",
  "meta_description",
  "slug",
  "supplier_sku",
  "status",
] as const;

export type DbField = (typeof DB_FIELDS)[number];

/** Human-readable labels for DB fields */
export const DB_FIELD_LABELS: Record<DbField, string> = {
  name_uk: "Назва (UK)",
  sku: "Артикул (наш SKU)",
  price: "Роздрібна ціна (₴)",
  wholesale_price: "Оптова ціна (₴)",
  old_price: "Стара ціна (₴)",
  quantity: "Залишок",
  brand_name: "Бренд",
  category_path: "Категорія",
  description_uk: "Опис (UK)",
  weight: "Вага (грам)",
  volume: "Об'єм (мл)",
  barcode: "Штрих-код EAN",
  main_image_url: "URL фото",
  meta_title: "SEO заголовок",
  meta_description: "SEO опис",
  slug: "URL-адреса (slug)",
  supplier_sku: "Артикул постачальника",
  status: "Статус",
};

/* ------------------------------------------------------------------ */
/*  AI #1 — File structure analysis                                   */
/* ------------------------------------------------------------------ */

export interface FileStructureResult {
  header_row: number;
  data_start_row: number;
  data_end_indicator: string | null;
  active_columns: string[];
  skip_rows: number[];
  file_type: string;
  confidence: number;
  notes: string;
}

/* ------------------------------------------------------------------ */
/*  AI #2 — Column mapping                                            */
/* ------------------------------------------------------------------ */

export interface ColumnMapping {
  file_column: string;
  db_field: DbField | null;
  confidence: number;
  reasoning: string;
}

/* ------------------------------------------------------------------ */
/*  AI #3 — Validation issues                                         */
/* ------------------------------------------------------------------ */

export type ValidationSeverity = "critical" | "warning" | "info";

export interface ValidationIssue {
  row: number;
  field: string;
  value: string;
  issue: string;
  suggestion: string;
  suggested_value?: string;
  confidence: number;
  severity: ValidationSeverity;
  accepted?: boolean;
}

/* ------------------------------------------------------------------ */
/*  AI #4 — Enrichment                                                */
/* ------------------------------------------------------------------ */

export interface EnrichmentSuggestion {
  row: number;
  field: DbField;
  current_value: string | null;
  suggested_value: string;
  reasoning: string;
  confidence: number;
  accepted?: boolean;
}

export interface ProductMatch {
  file_row: number;
  file_name: string;
  file_sku: string;
  matched_product_id: string | null;
  matched_name: string | null;
  matched_sku: string | null;
  confidence: number;
  reasoning: string;
}

/* ------------------------------------------------------------------ */
/*  AI #5 — Post-import report                                        */
/* ------------------------------------------------------------------ */

export interface PostImportReport {
  total_imported: number;
  new_products: number;
  updated_products: number;
  skipped: number;
  price_changes: {
    average_change_percent: number;
    increased_above_15: number;
    decreased_above_20: number;
    below_cost: number;
  };
  stock_changes: {
    went_out_of_stock: number;
    back_in_stock: number;
  };
  recommendations: Array<{
    type: "critical" | "warning" | "info";
    message: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Import session / wizard state                                     */
/* ------------------------------------------------------------------ */

export type ImportStep =
  | "upload"
  | "structure"
  | "mapping"
  | "validation"
  | "preview"
  | "importing"
  | "report";

export interface ParsedFile {
  filename: string;
  sheets: string[];
  active_sheet: string;
  raw_rows: string[][];
  total_rows: number;
}

export interface ImportSession {
  id: string;
  step: ImportStep;
  file: ParsedFile | null;
  ai_enabled: boolean;
  ai_features: {
    structure: boolean;
    mapping: boolean;
    validation: boolean;
    enrichment: boolean;
    report: boolean;
  };
  structure: FileStructureResult | null;
  mappings: ColumnMapping[];
  validation_issues: ValidationIssue[];
  enrichments: EnrichmentSuggestion[];
  product_matches: ProductMatch[];
  import_mode: "create" | "update" | "create_or_update";
  duplicate_strategy: "skip" | "update" | "create_new";
  match_field: "sku" | "name" | "barcode" | "supplier_sku";
}

/* ------------------------------------------------------------------ */
/*  AI Decision log (for learning)                                    */
/* ------------------------------------------------------------------ */

export interface AIDecisionLog {
  id: string;
  step: "structure" | "mapping" | "validation" | "enrichment" | "report";
  supplier_name: string | null;
  input_hash: string | null;
  ai_suggestion: unknown;
  user_decision: unknown;
  accepted: boolean;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  API payloads                                                      */
/* ------------------------------------------------------------------ */

export interface UploadResponse {
  ok: boolean;
  file: ParsedFile;
}

export interface AIAnalyzeRequest {
  step: "structure" | "mapping" | "validation" | "enrichment" | "report";
  data: unknown;
  context?: unknown;
}

export interface AIAnalyzeResponse {
  ok: boolean;
  result: unknown;
  fallback?: boolean;
}

export interface ImportExecuteRequest {
  mappings: ColumnMapping[];
  structure: FileStructureResult;
  rows: string[][];
  validation_fixes: Array<{ row: number; field: string; value: string }>;
  enrichments: EnrichmentSuggestion[];
  import_mode: "create" | "update" | "create_or_update";
  duplicate_strategy: "skip" | "update" | "create_new";
  match_field: "sku" | "name" | "barcode" | "supplier_sku";
}

export interface ImportExecuteResponse {
  ok: boolean;
  report: PostImportReport;
}
