"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Upload,
  Brain,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Info,
  Loader2,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
  Undo2,
  History,
  ImageIcon,
  Search,
  Filter,
  ShieldCheck,
  Beaker,
  Play,
  Square,
  ExternalLink,
} from "lucide-react";
import type {
  ImportStep,
  ParsedFile,
  FileStructureResult,
  ColumnMapping,
  ValidationIssue,
  EnrichmentSuggestion,
  PostImportReport,
  DbField,
} from "@/lib/import-export/types";
import { DB_FIELDS, DB_FIELD_LABELS } from "@/lib/import-export/types";
import { parseFileClient } from "@/lib/import-export/parsers/parse-client";
import { detectCSCartFormat, findCSCartDataStart } from "@/lib/import-export/parsers/detect-format-client";
import { mergeCSCartMultilangRows, verifyDescriptionMatch } from "@/lib/import-export/parsers/cscart-preprocessor-client";
import type { CSCartMergedProduct, CSCartPreprocessResult } from "@/lib/import-export/parsers/cscart-preprocessor-client";

/* ================================================================== */
/*  Types for matching / filtering                                     */
/* ================================================================== */

interface MatchResult {
  sku: string;
  cs_cart_id: number | null;
  file_name: string;
  db_id: string | null;
  db_name: string | null;
  db_sku: string | null;
  db_description_uk_exists: boolean;
  db_description_ru_exists: boolean;
  db_images_exist: boolean;
  status: "matched" | "not_found";
}

interface ImportOptions {
  importDescriptionUk: boolean;
  importDescriptionRu: boolean;
  importNames: boolean;
  importCategories: boolean;
  importImages: boolean;
  onlyFillEmpty: boolean;
  onlyUpdate: boolean;
  skipMismatchedDescriptions: boolean;
  saveSnapshot: boolean;
}

/* ================================================================== */
/*  Steps                                                              */
/* ================================================================== */

const STEPS_NORMAL: { key: ImportStep; label: string }[] = [
  { key: "upload", label: "Завантаження" },
  { key: "structure", label: "Структура" },
  { key: "mapping", label: "Маппінг" },
  { key: "validation", label: "Валідація" },
  { key: "preview", label: "Перегляд" },
  { key: "importing", label: "Імпорт" },
  { key: "report", label: "Звіт" },
];

const STEPS_CSCART: { key: ImportStep; label: string }[] = [
  { key: "upload", label: "Файл" },
  { key: "structure", label: "Структура" },
  { key: "matching", label: "Зіставлення" },
  { key: "filter", label: "Фільтрація" },
  { key: "verify", label: "Верифікація" },
  { key: "importing", label: "Імпорт" },
  { key: "report", label: "Звіт" },
];

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef(false);

  // AI toggle
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiFeatures, setAiFeatures] = useState({
    structure: true, mapping: true, validation: true, enrichment: false, report: true,
  });

  // Data state
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [structure, setStructure] = useState<FileStructureResult | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [enrichments, setEnrichments] = useState<EnrichmentSuggestion[]>([]);
  const [report, setReport] = useState<PostImportReport | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  // CS-Cart state
  const [csCartData, setCsCartData] = useState<CSCartPreprocessResult | null>(null);
  const [externalImageCount, setExternalImageCount] = useState(0);
  const [parseStatus, setParseStatus] = useState<string | null>(null);

  // Matching state
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [matchProgress, setMatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Filter state
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [filterOnlyMissing, setFilterOnlyMissing] = useState(false);

  // Import options
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    importDescriptionUk: true,
    importDescriptionRu: true,
    importNames: false,
    importCategories: false,
    importImages: true,
    onlyFillEmpty: true,
    onlyUpdate: true,
    skipMismatchedDescriptions: true,
    saveSnapshot: true,
  });

  // Verification
  const [verifyPage, setVerifyPage] = useState(0);
  const [descVerification, setDescVerification] = useState<Map<string, "ok" | "warning" | "error">>(new Map());

  // Test import
  const [testResults, setTestResults] = useState<Array<{ id: string; name: string; slug: string; updated: boolean }> | null>(null);

  // Import progress
  const [importProgress, setImportProgress] = useState<{
    current: number; total: number; created: number; updated: number; skipped: number; errors: number;
  } | null>(null);

  // Normal flow state
  const [importMode, setImportMode] = useState<"create" | "update" | "create_or_update">("create_or_update");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "update" | "create_new">("update");
  const [matchField, setMatchField] = useState<"sku" | "name" | "barcode" | "supplier_sku">("sku");

  const isCSCart = structure?.file_type === "cscart_multilang";
  const steps = isCSCart ? STEPS_CSCART : STEPS_NORMAL;
  const currentStepIdx = steps.findIndex((s) => s.key === step);

  // Helper: get filtered products (matched + selected brands/categories)
  const getFilteredProducts = useCallback((): CSCartMergedProduct[] => {
    if (!csCartData) return [];
    return csCartData.products.filter((p) => {
      if (p.match_status !== "matched" || !p.matched_product_id) return false;
      if (selectedBrands.size > 0 && !selectedBrands.has(p.brand_guess)) return false;
      if (selectedCategories.size > 0 && !selectedCategories.has(p.categories[0] ?? "")) return false;
      if (filterOnlyMissing) {
        const mr = matchResults.find((m) => m.sku === p.sku);
        if (mr?.db_description_uk_exists) return false;
      }
      if (importOptions.skipMismatchedDescriptions) {
        const v = descVerification.get(p.sku);
        if (v === "error") return false;
      }
      return true;
    });
  }, [csCartData, selectedBrands, selectedCategories, filterOnlyMissing, matchResults, importOptions.skipMismatchedDescriptions, descVerification]);

  /* ================================================================ */
  /*  Step 1: Upload & parse                                          */
  /* ================================================================ */
  const handleUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setParseStatus(null);
    try {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      setParseStatus(`Читання файлу... (${sizeMB} МБ)`);
      const buffer = await file.arrayBuffer();

      setParseStatus("Парсинг Excel...");
      const parsed = await new Promise<ParsedFile>((resolve, reject) => {
        setTimeout(() => { try { resolve(parseFileClient(buffer, file.name)); } catch (e) { reject(e); } }, 50);
      });
      setParsedFile(parsed);
      setParseStatus(`Знайдено ${parsed.total_rows.toLocaleString("uk-UA")} рядків`);

      const isCSCartFile = detectCSCartFormat(parsed.raw_rows);
      if (isCSCartFile) {
        setParseStatus("CS-Cart формат. Об'єднання мовних рядків...");
        const dataStart = findCSCartDataStart(parsed.raw_rows);
        const dataRows = parsed.raw_rows.slice(dataStart);

        const merged = await new Promise<CSCartPreprocessResult>((resolve) => {
          setTimeout(() => { resolve(mergeCSCartMultilangRows(dataRows)); }, 50);
        });
        setCsCartData(merged);
        setParseStatus(`Готово: ${merged.stats.total_products.toLocaleString("uk-UA")} товарів`);

        setStructure({
          header_row: 0, data_start_row: dataStart, data_end_indicator: null,
          active_columns: [], skip_rows: [],
          file_type: "cscart_multilang", confidence: 0.97,
          notes: `CS-Cart мультимовний експорт. ${merged.stats.total_products} товарів.`,
        });

        // Preselect all brands and top categories
        setSelectedBrands(new Set(merged.stats.brands.map((b) => b.name)));
        setSelectedCategories(new Set(merged.stats.top_categories.map((c) => c.name)));

        setStep("structure");
      } else {
        setStep("structure");
        await analyzeStructure(parsed);
      }
      setParseStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка обробки файлу");
      setParseStatus(null);
    }
    setLoading(false);
  }, [aiEnabled, aiFeatures.structure]);

  /* ================================================================ */
  /*  Non-CS-Cart: structure analysis                                 */
  /* ================================================================ */
  const analyzeStructure = useCallback(async (file: ParsedFile) => {
    setLoading(true);
    try {
      const previewRows = file.raw_rows.slice(0, 50);
      const res = await fetch("/api/admin/import/ai-analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "structure", data: { rows: previewRows }, context: { ai_enabled: aiEnabled && aiFeatures.structure } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setStructure(json.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка аналізу структури");
    }
    setLoading(false);
  }, [aiEnabled, aiFeatures.structure]);

  /* ================================================================ */
  /*  Non-CS-Cart: mapping                                            */
  /* ================================================================ */
  const runMapping = useCallback(async () => {
    if (!parsedFile || !structure) return;
    setLoading(true); setError(null);
    try {
      const previewRows = parsedFile.raw_rows.slice(0, Math.min(structure.data_start_row + 20, 50));
      const res = await fetch("/api/admin/import/ai-analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "mapping", data: { rows: previewRows, header_row: structure.header_row, data_start_row: structure.data_start_row }, context: { ai_enabled: aiEnabled && aiFeatures.mapping } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMappings(json.result);
      setStep("mapping");
    } catch (err) { setError(err instanceof Error ? err.message : "Помилка маппінгу"); }
    setLoading(false);
  }, [parsedFile, structure, aiEnabled, aiFeatures.mapping]);

  /* ================================================================ */
  /*  Non-CS-Cart: validation                                         */
  /* ================================================================ */
  const runValidation = useCallback(async () => {
    if (!parsedFile || !structure) return;
    setLoading(true); setError(null);
    try {
      const valPreviewRows = parsedFile.raw_rows.slice(0, Math.min(structure.data_start_row + 50, 100));
      const res = await fetch("/api/admin/import/ai-analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "validation", data: { rows: valPreviewRows, mappings, header_row: structure.header_row, data_start_row: structure.data_start_row }, context: { ai_enabled: aiEnabled && aiFeatures.validation } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setValidationIssues(json.result);
      setStep("validation");
    } catch (err) { setError(err instanceof Error ? err.message : "Помилка валідації"); }
    setLoading(false);
  }, [parsedFile, structure, mappings, aiEnabled, aiFeatures.validation]);

  /* ================================================================ */
  /*  Non-CS-Cart: execute                                            */
  /* ================================================================ */
  const executeImport = useCallback(async () => {
    if (!parsedFile || !structure) return;
    setStep("importing"); setLoading(true); setError(null);
    try {
      const acceptedFixes = validationIssues.filter((v) => v.accepted && v.suggested_value).map((v) => ({ row: v.row, field: v.field, value: v.suggested_value! }));
      const res = await fetch("/api/admin/import/execute", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings, structure, rows: parsedFile.raw_rows, validation_fixes: acceptedFixes, enrichments: enrichments.filter((e) => e.accepted), import_mode: importMode, duplicate_strategy: duplicateStrategy, match_field: matchField, filename: parsedFile.filename }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setReport(json.report); setBatchId(json.batch_id ?? null); setStep("report");
    } catch (err) { setError(err instanceof Error ? err.message : "Помилка імпорту"); setStep("preview"); }
    setLoading(false);
  }, [parsedFile, structure, mappings, validationIssues, enrichments, importMode, duplicateStrategy, matchField]);

  /* ================================================================ */
  /*  CS-Cart: Step 3 — Match products against DB                     */
  /* ================================================================ */
  const runMatching = useCallback(async () => {
    if (!csCartData) return;
    setStep("matching"); setLoading(true); setError(null);
    setMatchProgress(null); setMatchResults([]);

    try {
      const products = csCartData.products;
      const batchSize = 500;
      const allResults: MatchResult[] = [];

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        setMatchProgress({ current: Math.min(i + batchSize, products.length), total: products.length });

        const res = await fetch("/api/admin/import/match-products", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: batch.map((p) => ({ sku: p.sku, cs_cart_id: p.cs_cart_id, name_uk: p.name_uk })) }),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Помилка зіставлення (${res.status}): ${errText}`);
        }
        const json = await res.json();
        allResults.push(...json.matches);
      }

      setMatchResults(allResults);

      // Update products with match info
      const matchMap = new Map(allResults.map((m) => [m.sku, m]));
      const updatedProducts = csCartData.products.map((p) => {
        const match = matchMap.get(p.sku);
        if (match && match.status === "matched" && match.db_id) {
          return { ...p, matched_product_id: match.db_id, matched_product_name: match.db_name, match_status: "matched" as const };
        }
        return { ...p, match_status: "not_found" as const };
      });
      setCsCartData({ ...csCartData, products: updatedProducts });

      // Run description verification
      const verMap = new Map<string, "ok" | "warning" | "error">();
      for (const p of updatedProducts) {
        if (p.match_status === "matched" && p.description_uk) {
          verMap.set(p.sku, verifyDescriptionMatch(p.name_uk, p.description_uk));
        }
      }
      setDescVerification(verMap);

      setStep("filter");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка зіставлення");
      setStep("structure");
    }
    setLoading(false); setMatchProgress(null);
  }, [csCartData]);

  /* ================================================================ */
  /*  CS-Cart: Test import (20 items)                                 */
  /* ================================================================ */
  const runTestImport = useCallback(async () => {
    const filtered = getFilteredProducts();
    if (filtered.length === 0) return;
    setLoading(true); setError(null); setTestResults(null);

    try {
      const testItems = filtered.slice(0, 20);
      const startRes = await fetch("/api/admin/import/start-batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: parsedFile?.filename ?? "test", totalRows: testItems.length, type: "cscart_test" }),
      });
      if (!startRes.ok) throw new Error("Помилка створення тестового батчу");
      const startJson = await startRes.json();
      const testBatchId = startJson.batchId as string;
      setBatchId(testBatchId);

      const res = await fetch("/api/admin/import/execute-batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: testBatchId, items: testItems, isLast: true, options: importOptions }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Тестовий імпорт: ${errText}`);
      }
      const json = await res.json();

      // Build test results with links
      const results: Array<{ id: string; name: string; slug: string; updated: boolean }> = [];
      for (const item of testItems) {
        if (item.matched_product_id) {
          const mr = matchResults.find((m) => m.sku === item.sku);
          results.push({
            id: item.matched_product_id,
            name: item.name_uk,
            slug: mr?.db_sku ?? item.sku,
            updated: true,
          });
        }
      }
      setTestResults(results);
      setStep("test_result");

      setReport({
        total_imported: json.updated ?? 0, new_products: json.created ?? 0,
        updated_products: json.updated ?? 0, skipped: json.skipped ?? 0,
        price_changes: { average_change_percent: 0, increased_above_15: 0, decreased_above_20: 0, below_cost: 0 },
        stock_changes: { went_out_of_stock: 0, back_in_stock: 0 }, recommendations: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка тестового імпорту");
    }
    setLoading(false);
  }, [getFilteredProducts, parsedFile, matchResults, importOptions]);

  /* ================================================================ */
  /*  CS-Cart: Full import with STOP button                           */
  /* ================================================================ */
  const executeCSCartImport = useCallback(async () => {
    const filtered = getFilteredProducts();
    if (filtered.length === 0) return;
    setStep("importing"); setLoading(true); setError(null);
    setImportProgress(null); stopRef.current = false;

    try {
      const startRes = await fetch("/api/admin/import/start-batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: parsedFile?.filename ?? "cs-cart", totalRows: filtered.length, type: "cscart" }),
      });
      if (!startRes.ok) throw new Error("start-batch failed");
      const startJson = await startRes.json();
      const currentBatchId = startJson.batchId as string;
      setBatchId(currentBatchId);

      const MAX_PAYLOAD_BYTES = 3.5 * 1024 * 1024;
      const chunks: CSCartMergedProduct[][] = [];
      let currentChunk: CSCartMergedProduct[] = [];
      let currentSize = 0;

      for (const product of filtered) {
        const itemSize = estimateJsonSize(product);
        if (currentChunk.length > 0 && (currentSize + itemSize > MAX_PAYLOAD_BYTES || currentChunk.length >= 200)) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentSize = 0;
        }
        currentChunk.push(product);
        currentSize += itemSize;
      }
      if (currentChunk.length > 0) chunks.push(currentChunk);

      let totalUpdated = 0, totalSkipped = 0, totalErrors = 0, processedCount = 0;
      let lastReport = null;

      for (let i = 0; i < chunks.length; i++) {
        if (stopRef.current) {
          await fetch("/api/admin/import/start-batch", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ batchId: currentBatchId, status: "stopped" }),
          }).catch(() => {});
          break;
        }

        const chunk = chunks[i];
        const isLast = i === chunks.length - 1;

        const res = await fetch("/api/admin/import/execute-batch", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId: currentBatchId, items: chunk, isLast, options: importOptions }),
        });
        if (!res.ok) {
          let errMsg: string;
          try { const ej = await res.json(); errMsg = ej.error || res.statusText; } catch { errMsg = `HTTP ${res.status}`; }
          throw new Error(`Батч ${i + 1}/${chunks.length}: ${errMsg}`);
        }
        const json = await res.json();
        totalUpdated += json.updated ?? 0;
        totalSkipped += json.skipped ?? 0;
        totalErrors += json.errors ?? 0;
        processedCount += chunk.length;
        setImportProgress({ current: processedCount, total: filtered.length, created: 0, updated: totalUpdated, skipped: totalSkipped, errors: totalErrors });
        if (json.report) lastReport = json.report;
      }

      if (lastReport) {
        setReport(lastReport);
        setExternalImageCount(lastReport.external_image_count ?? 0);
      } else {
        setReport({
          total_imported: totalUpdated, new_products: 0, updated_products: totalUpdated,
          skipped: totalSkipped,
          price_changes: { average_change_percent: 0, increased_above_15: 0, decreased_above_20: 0, below_cost: 0 },
          stock_changes: { went_out_of_stock: 0, back_in_stock: 0 },
          recommendations: stopRef.current ? [{ type: "warning", message: `Імпорт зупинено. Оброблено ${processedCount} з ${filtered.length}` }] : [],
        });
      }
      setStep("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка імпорту");
      setStep("verify");
    }
    setLoading(false); setImportProgress(null);
  }, [getFilteredProducts, parsedFile, importOptions]);

  /* ================================================================ */
  /*  Reset                                                           */
  /* ================================================================ */
  const resetAll = () => {
    setStep("upload"); setParsedFile(null); setStructure(null); setMappings([]);
    setValidationIssues([]); setEnrichments([]); setReport(null); setBatchId(null);
    setCsCartData(null); setExternalImageCount(0); setImportProgress(null);
    setMatchResults([]); setMatchProgress(null); setSelectedBrands(new Set());
    setSelectedCategories(new Set()); setTestResults(null); setDescVerification(new Map());
    setVerifyPage(0); setFilterOnlyMissing(false);
    setImportOptions({
      importDescriptionUk: true, importDescriptionRu: true, importNames: false,
      importCategories: false, importImages: true, onlyFillEmpty: true,
      onlyUpdate: true, skipMismatchedDescriptions: true, saveSnapshot: true,
    });
  };

  /* ================================================================ */
  /*  Computed stats                                                  */
  /* ================================================================ */
  const matchedCount = matchResults.filter((m) => m.status === "matched").length;
  const notFoundCount = matchResults.filter((m) => m.status === "not_found").length;
  const matchedWithDescUk = matchResults.filter((m) => m.status === "matched" && m.db_description_uk_exists).length;
  const filteredProducts = step === "verify" || step === "test_result" || step === "importing" ? getFilteredProducts() : [];
  const descErrors = [...descVerification.values()].filter((v) => v === "error").length;
  const descWarnings = [...descVerification.values()].filter((v) => v === "warning").length;
  const descOk = [...descVerification.values()].filter((v) => v === "ok").length;

  /* ================================================================ */
  /*  Render                                                          */
  /* ================================================================ */
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1 flex items-center gap-3" style={{ color: "var(--a-text)" }}>
            <FileSpreadsheet className="w-6 h-6" style={{ color: "var(--a-accent)" }} />
            Імпорт товарів
          </h1>
          <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
            Завантажте Excel або CSV файл з товарами
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/import/history" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
            style={{ background: "var(--a-bg-input)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}>
            <History className="w-4 h-4" /> Історія
          </Link>
          {!isCSCart && (
            <button onClick={() => setAiEnabled(!aiEnabled)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={aiEnabled
                ? { background: "linear-gradient(135deg, #7c3aed20, #a855f720)", color: "#a855f7", border: "1px solid #a855f740" }
                : { background: "var(--a-bg-input)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}>
              <Brain className="w-4 h-4" /> AI: {aiEnabled ? "ON" : "OFF"}
            </button>
          )}
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {steps.map((s, idx) => {
          const isActive = idx === currentStepIdx;
          const isDone = idx < currentStepIdx;
          return (
            <div key={s.key} className="flex items-center">
              {idx > 0 && <div className="w-6 h-px mx-1" style={{ background: isDone ? "var(--a-accent)" : "var(--a-border)" }} />}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                style={isActive
                  ? { background: "var(--a-accent-bg)", color: "var(--a-accent)", border: "1px solid var(--a-accent)" }
                  : isDone
                    ? { background: "#052e16", color: "#4ade80", border: "1px solid #4ade8040" }
                    : { background: "var(--a-bg-input)", color: "var(--a-text-4)", border: "1px solid var(--a-border)" }}>
                {isDone ? <Check className="w-3 h-3" /> : <span className="w-3 text-center">{idx + 1}</span>}
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4" style={{ background: "#450a0a", border: "1px solid #f8717140", color: "#f87171" }}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-sm break-all">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* AI features panel */}
      {aiEnabled && step === "upload" && !isCSCart && (
        <div className="rounded-xl p-4 mb-6" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "var(--a-card-shadow)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: "#a855f7" }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>AI-функції</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {([
              { key: "structure" as const, label: "Розпізнавання структури" },
              { key: "mapping" as const, label: "Маппінг колонок" },
              { key: "validation" as const, label: "Валідація" },
              { key: "enrichment" as const, label: "Збагачення даних" },
              { key: "report" as const, label: "Аналітика" },
            ]).map((f) => (
              <label key={f.key} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm"
                style={{ background: "var(--a-bg-input)", color: aiFeatures[f.key] ? "var(--a-text-2)" : "var(--a-text-4)" }}>
                <input type="checkbox" checked={aiFeatures[f.key]} onChange={(e) => setAiFeatures((p) => ({ ...p, [f.key]: e.target.checked }))} className="accent-purple-500" />
                {f.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Migrate images link on upload step */}
      {step === "upload" && (
        <Link href="/admin/import/migrate-images"
          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 transition-colors hover:opacity-80"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "var(--a-card-shadow)" }}>
          <ImageIcon className="w-5 h-5" style={{ color: "#a855f7" }} />
          <span className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>Міграція фото з CS-Cart → Storage</span>
          <ArrowRight className="w-4 h-4 ml-auto" style={{ color: "var(--a-text-4)" }} />
        </Link>
      )}

      {/* Step content */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "var(--a-card-shadow)" }}>

        {step === "upload" && <UploadStep loading={loading} parseStatus={parseStatus} onUpload={handleUpload} />}

        {/* CS-Cart: Structure overview */}
        {step === "structure" && isCSCart && csCartData && (
          <CSCartStructureStep
            csCartData={csCartData}
            filename={parsedFile?.filename ?? ""}
            loading={loading}
            onNext={runMatching}
          />
        )}

        {/* CS-Cart: Matching progress */}
        {step === "matching" && (
          <MatchingStep progress={matchProgress} matchedCount={matchedCount} notFoundCount={notFoundCount} total={csCartData?.products.length ?? 0} loading={loading} />
        )}

        {/* CS-Cart: Filter + Options */}
        {step === "filter" && csCartData && (
          <FilterStep
            csCartData={csCartData}
            matchResults={matchResults}
            matchedCount={matchedCount}
            notFoundCount={notFoundCount}
            matchedWithDescUk={matchedWithDescUk}
            selectedBrands={selectedBrands}
            selectedCategories={selectedCategories}
            filterOnlyMissing={filterOnlyMissing}
            importOptions={importOptions}
            onBrandsChange={setSelectedBrands}
            onCategoriesChange={setSelectedCategories}
            onFilterOnlyMissing={setFilterOnlyMissing}
            onOptionsChange={setImportOptions}
            onNext={() => { setVerifyPage(0); setStep("verify"); }}
            onBack={() => setStep("structure")}
          />
        )}

        {/* CS-Cart: Verification */}
        {step === "verify" && csCartData && (
          <VerifyStep
            products={filteredProducts}
            matchResults={matchResults}
            descVerification={descVerification}
            descOk={descOk}
            descWarnings={descWarnings}
            descErrors={descErrors}
            page={verifyPage}
            onPageChange={setVerifyPage}
            loading={loading}
            onTestImport={runTestImport}
            onFullImport={executeCSCartImport}
            onBack={() => setStep("filter")}
          />
        )}

        {/* CS-Cart: Test result */}
        {step === "test_result" && testResults && report && (
          <TestResultStep
            results={testResults}
            report={report}
            batchId={batchId}
            totalFiltered={getFilteredProducts().length}
            onFullImport={executeCSCartImport}
            onBack={() => setStep("verify")}
            loading={loading}
          />
        )}

        {/* Normal flow */}
        {step === "structure" && structure && parsedFile && !isCSCart && (
          <StructureStep structure={structure} rows={parsedFile.raw_rows} loading={loading} onConfirm={() => runMapping()} onEdit={(s) => setStructure(s)} />
        )}
        {step === "mapping" && !isCSCart && (
          <MappingStep mappings={mappings} loading={loading} onUpdate={setMappings} onConfirm={() => runValidation()} onBack={() => setStep("structure")} />
        )}
        {step === "validation" && !isCSCart && (
          <ValidationStep issues={validationIssues} loading={loading} onUpdate={setValidationIssues} onConfirm={() => setStep("preview")} onBack={() => setStep("mapping")} />
        )}
        {step === "preview" && parsedFile && structure && !isCSCart && (
          <PreviewStep file={parsedFile} structure={structure} mappings={mappings} importMode={importMode} duplicateStrategy={duplicateStrategy} matchField={matchField}
            onModeChange={setImportMode} onDuplicateChange={setDuplicateStrategy} onMatchChange={setMatchField}
            onConfirm={executeImport} onBack={() => setStep("validation")} loading={loading} />
        )}

        {/* Import progress (shared) */}
        {step === "importing" && (
          <ImportingStep
            progress={importProgress}
            onStop={() => { stopRef.current = true; }}
            isStopping={stopRef.current}
          />
        )}

        {/* Report */}
        {step === "report" && report && (
          <ReportStep report={report} batchId={batchId} externalImageCount={externalImageCount} onNewImport={resetAll} />
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function estimateJsonSize(obj: unknown): number {
  const str = JSON.stringify(obj);
  return Math.ceil(str.length * 1.5);
}

/* ================================================================== */
/*  Upload Step                                                        */
/* ================================================================== */

function UploadStep({ loading, parseStatus, onUpload }: { loading: boolean; parseStatus: string | null; onUpload: (f: File) => void }) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <div className="p-8">
      <div className="border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer"
        style={{ borderColor: dragOver ? "var(--a-accent)" : "var(--a-border)", background: dragOver ? "var(--a-accent-bg)" : "transparent" }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onUpload(f); }}
        onClick={() => {
          if (loading) return;
          const input = document.createElement("input");
          input.type = "file"; input.accept = ".xlsx,.xls,.csv,.tsv,.txt";
          input.onchange = () => { const f = input.files?.[0]; if (f) onUpload(f); };
          input.click();
        }}>
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--a-accent)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>{parseStatus ?? "Обробка файлу..."}</p>
            <p className="text-xs" style={{ color: "var(--a-text-4)" }}>Файл обробляється локально в браузері</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10" style={{ color: "var(--a-text-4)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>Перетягніть файл або натисніть для вибору</p>
            <p className="text-xs" style={{ color: "var(--a-text-4)" }}>Excel (.xlsx, .xls) або CSV — без обмеження розміру</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  CS-Cart Structure Step                                             */
/* ================================================================== */

function CSCartStructureStep({ csCartData, filename, loading, onNext }: {
  csCartData: CSCartPreprocessResult; filename: string; loading: boolean; onNext: () => void;
}) {
  const { stats } = csCartData;
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#7c3aed20", border: "1px solid #a855f740" }}>
          <FileSpreadsheet className="w-4 h-4" style={{ color: "#a855f7" }} />
          <span className="text-sm font-semibold" style={{ color: "#a855f7" }}>CS-Cart мультимовний експорт</span>
        </div>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--a-text-4)" }}>Файл: {filename}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Товарів" value={stats.total_products} color="#a855f7" />
        <StatCard label="Рядків" value={stats.total_rows} color="#60a5fa" />
        <StatCard label="З описами (UK)" value={stats.with_description_uk} color="#4ade80" />
        <StatCard label="З описами (RU)" value={stats.with_description_ru} color="#4ade80" />
        <StatCard label="З фото" value={stats.with_photos} color="#fbbf24" />
        <StatCard label="Категорій" value={stats.unique_categories} color="#60a5fa" />
        <StatCard label="Тільки 1 мова" value={stats.single_lang_only} color="#f87171" />
        <StatCard label="Без SKU" value={stats.skipped_no_sku} color="#f87171" />
      </div>

      {/* Top brands preview */}
      {stats.brands.length > 0 && (
        <div className="rounded-xl p-3 mb-5" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
          <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>Бренди (топ-10)</h3>
          <div className="flex flex-wrap gap-2">
            {stats.brands.slice(0, 10).map((b) => (
              <span key={b.name} className="px-2 py-1 rounded-lg text-xs" style={{ background: "var(--a-bg-card)", color: "var(--a-text-2)", border: "1px solid var(--a-border-sub)" }}>
                {b.name} <span style={{ color: "var(--a-text-4)" }}>({b.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {csCartData.errors.length > 0 && (
        <div className="rounded-xl p-3 mb-5" style={{ background: "#450a0a20", border: "1px solid #f8717130" }}>
          <h3 className="text-xs font-semibold mb-2" style={{ color: "#f87171" }}>Попередження ({csCartData.errors.length})</h3>
          <div className="space-y-1 max-h-[120px] overflow-y-auto">
            {csCartData.errors.slice(0, 10).map((err, i) => (
              <div key={i} className="text-xs" style={{ color: "var(--a-text-3)" }}>
                <span className="font-mono" style={{ color: "var(--a-text-4)" }}>#{err.row}</span> {err.error}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onNext} disabled={loading || stats.total_products === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--a-accent-btn)" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Далі: Зіставити з базою
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Matching Step (progress)                                           */
/* ================================================================== */

function MatchingStep({ progress, matchedCount, notFoundCount, total, loading }: {
  progress: { current: number; total: number } | null; matchedCount: number; notFoundCount: number; total: number; loading: boolean;
}) {
  const pct = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  return (
    <div className="p-12 text-center">
      <Search className="w-12 h-12 mx-auto mb-4 animate-pulse" style={{ color: "var(--a-accent)" }} />
      <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--a-text)" }}>Зіставлення товарів з базою...</h2>
      {progress && (
        <div className="max-w-md mx-auto mt-4">
          <div className="relative h-5 rounded-full overflow-hidden mb-3" style={{ background: "var(--a-bg-input)" }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #7c3aed, #a855f7)" }} />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: "var(--a-text-2)" }}>{pct}%</span>
          </div>
          <p className="text-sm tabular-nums" style={{ color: "var(--a-text-3)" }}>
            {progress.current.toLocaleString("uk-UA")} / {progress.total.toLocaleString("uk-UA")}
          </p>
        </div>
      )}
      {!loading && matchedCount > 0 && (
        <div className="mt-4 flex justify-center gap-4 text-sm">
          <span style={{ color: "#4ade80" }}>Знайдено: {matchedCount}</span>
          <span style={{ color: "#f87171" }}>Не знайдено: {notFoundCount}</span>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Filter + Options Step                                              */
/* ================================================================== */

function FilterStep({ csCartData, matchResults, matchedCount, notFoundCount, matchedWithDescUk, selectedBrands, selectedCategories, filterOnlyMissing, importOptions, onBrandsChange, onCategoriesChange, onFilterOnlyMissing, onOptionsChange, onNext, onBack }: {
  csCartData: CSCartPreprocessResult;
  matchResults: MatchResult[];
  matchedCount: number; notFoundCount: number; matchedWithDescUk: number;
  selectedBrands: Set<string>; selectedCategories: Set<string>;
  filterOnlyMissing: boolean;
  importOptions: ImportOptions;
  onBrandsChange: (v: Set<string>) => void;
  onCategoriesChange: (v: Set<string>) => void;
  onFilterOnlyMissing: (v: boolean) => void;
  onOptionsChange: (v: ImportOptions) => void;
  onNext: () => void; onBack: () => void;
}) {
  const { stats } = csCartData;
  const matchedWithDescRu = matchResults.filter((m) => m.status === "matched" && m.db_description_ru_exists).length;

  const toggleBrand = (name: string) => {
    const next = new Set(selectedBrands);
    if (next.has(name)) next.delete(name); else next.add(name);
    onBrandsChange(next);
  };
  const selectAllBrands = () => onBrandsChange(new Set(stats.brands.map((b) => b.name)));
  const deselectAllBrands = () => onBrandsChange(new Set());
  const toggleCategory = (name: string) => {
    const next = new Set(selectedCategories);
    if (next.has(name)) next.delete(name); else next.add(name);
    onCategoriesChange(next);
  };

  // Count how many selected items will be imported
  const selectedCount = csCartData.products.filter((p) => {
    if (p.match_status !== "matched" || !p.matched_product_id) return false;
    if (selectedBrands.size > 0 && !selectedBrands.has(p.brand_guess)) return false;
    if (selectedCategories.size > 0 && !selectedCategories.has(p.categories[0] ?? "")) return false;
    return true;
  }).length;

  return (
    <div className="p-6">
      {/* Match summary */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5" style={{ color: "#a855f7" }} />
        <h2 className="text-lg font-semibold" style={{ color: "var(--a-text)" }}>Фільтрація та налаштування</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="У файлі" value={stats.total_products} color="#60a5fa" />
        <StatCard label="Знайдено в базі" value={matchedCount} color="#4ade80" />
        <StatCard label="Не знайдено" value={notFoundCount} color="#f87171" />
        <StatCard label="З описами в базі" value={matchedWithDescUk} color="#fbbf24" />
      </div>

      {/* Quick filter */}
      <div className="flex flex-wrap gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--a-text-2)" }}>
          <input type="checkbox" checked={filterOnlyMissing} onChange={(e) => onFilterOnlyMissing(e.target.checked)} className="accent-purple-500" />
          Тільки товари без описів в базі
        </label>
      </div>

      {/* Brands */}
      <div className="rounded-xl p-4 mb-4" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>По брендах</h3>
          <div className="flex gap-2">
            <button onClick={selectAllBrands} className="text-[10px] px-2 py-0.5 rounded" style={{ color: "#4ade80", background: "#052e16" }}>Всі</button>
            <button onClick={deselectAllBrands} className="text-[10px] px-2 py-0.5 rounded" style={{ color: "#f87171", background: "#450a0a" }}>Жоден</button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-[250px] overflow-y-auto">
          {stats.brands.map((b) => {
            const brandProducts = csCartData.products.filter((p) => p.brand_guess === b.name);
            const brandMatched = brandProducts.filter((p) => p.match_status === "matched").length;
            const brandWithDesc = brandProducts.filter((p) => p.description_uk.length > 10).length;
            return (
              <label key={b.name} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:opacity-80"
                style={{ background: selectedBrands.has(b.name) ? "var(--a-accent-bg)" : "var(--a-bg-card)", border: `1px solid ${selectedBrands.has(b.name) ? "var(--a-accent)" : "var(--a-border-sub)"}` }}>
                <input type="checkbox" checked={selectedBrands.has(b.name)} onChange={() => toggleBrand(b.name)} className="accent-purple-500" />
                <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--a-text-2)" }}>{b.name}</span>
                <span className="text-[10px] shrink-0" style={{ color: "var(--a-text-4)" }}>{brandMatched}/{b.count}</span>
                <span className="text-[10px] shrink-0" style={{ color: brandWithDesc > 0 ? "#4ade80" : "var(--a-text-5)" }}>
                  {brandWithDesc > 0 ? `${brandWithDesc} описів` : "—"}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Categories */}
      <div className="rounded-xl p-4 mb-4" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
        <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>По категоріях (top-level)</h3>
        <div className="flex flex-wrap gap-2">
          {stats.top_categories.map((c) => (
            <label key={c.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer text-xs"
              style={{ background: selectedCategories.has(c.name) ? "var(--a-accent-bg)" : "var(--a-bg-card)", color: "var(--a-text-2)", border: `1px solid ${selectedCategories.has(c.name) ? "var(--a-accent)" : "var(--a-border-sub)"}` }}>
              <input type="checkbox" checked={selectedCategories.has(c.name)} onChange={() => toggleCategory(c.name)} className="accent-purple-500 w-3 h-3" />
              {c.name} ({c.count})
            </label>
          ))}
        </div>
      </div>

      {/* Import options */}
      <div className="rounded-xl p-4 mb-4" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
        <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>Що імпортувати</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <OptionCheckbox checked={importOptions.importDescriptionUk} onChange={(v) => onOptionsChange({ ...importOptions, importDescriptionUk: v })} label="Описи українською" />
          <OptionCheckbox checked={importOptions.importDescriptionRu} onChange={(v) => onOptionsChange({ ...importOptions, importDescriptionRu: v })} label="Описи російською" />
          <OptionCheckbox checked={importOptions.importNames} onChange={(v) => onOptionsChange({ ...importOptions, importNames: v })} label="Назви (name_uk, name_ru)" />
          <OptionCheckbox checked={importOptions.importCategories} onChange={(v) => onOptionsChange({ ...importOptions, importCategories: v })} label="Категорії" />
          <OptionCheckbox checked={importOptions.importImages} onChange={(v) => onOptionsChange({ ...importOptions, importImages: v })} label="URL фото" />
        </div>
        <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--a-border)" }}>
          <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--a-text-3)" }}>Поведінка</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--a-text-2)" }}>
              <input type="radio" name="fill" checked={importOptions.onlyFillEmpty} onChange={() => onOptionsChange({ ...importOptions, onlyFillEmpty: true })} className="accent-purple-500" />
              Заповнити тільки порожні поля (безпечно)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--a-text-2)" }}>
              <input type="radio" name="fill" checked={!importOptions.onlyFillEmpty} onChange={() => onOptionsChange({ ...importOptions, onlyFillEmpty: false })} className="accent-purple-500" />
              Перезаписати все (навіть якщо вже є)
            </label>
          </div>
        </div>
        <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--a-border)" }}>
          <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--a-text-3)" }}>Безпека</h4>
          <div className="space-y-2">
            <OptionCheckbox checked={importOptions.onlyUpdate} onChange={(v) => onOptionsChange({ ...importOptions, onlyUpdate: v })} label="Тільки оновлення — НЕ створювати нові товари" />
            <OptionCheckbox checked={importOptions.skipMismatchedDescriptions} onChange={(v) => onOptionsChange({ ...importOptions, skipMismatchedDescriptions: v })} label="Пропускати товари з невідповідними описами" />
            <OptionCheckbox checked={importOptions.saveSnapshot} onChange={(v) => onOptionsChange({ ...importOptions, saveSnapshot: v })} label="Зберігати snapshot для відкату" />
          </div>
        </div>
      </div>

      {/* Selection summary */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4" style={{ background: "#7c3aed15", border: "1px solid #a855f730" }}>
        <span className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>
          Вибрано для імпорту: <strong style={{ color: "#a855f7" }}>{selectedCount.toLocaleString("uk-UA")}</strong> товарів
        </span>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>
        <button onClick={onNext} disabled={selectedCount === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--a-accent-btn)" }}>
          <ShieldCheck className="w-4 h-4" /> Далі: Верифікація
        </button>
      </div>
    </div>
  );
}

function OptionCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: checked ? "var(--a-text-2)" : "var(--a-text-4)" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-purple-500 w-4 h-4" />
      {label}
    </label>
  );
}

/* ================================================================== */
/*  Verify Step                                                        */
/* ================================================================== */

function VerifyStep({ products, matchResults, descVerification, descOk, descWarnings, descErrors, page, onPageChange, loading, onTestImport, onFullImport, onBack }: {
  products: CSCartMergedProduct[];
  matchResults: MatchResult[];
  descVerification: Map<string, "ok" | "warning" | "error">;
  descOk: number; descWarnings: number; descErrors: number;
  page: number; onPageChange: (p: number) => void;
  loading: boolean;
  onTestImport: () => void; onFullImport: () => void; onBack: () => void;
}) {
  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(products.length / PAGE_SIZE);
  const pageItems = products.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5" style={{ color: "#a855f7" }} />
        <h2 className="text-lg font-semibold" style={{ color: "var(--a-text)" }}>Верифікація</h2>
        <span className="ml-auto text-xs" style={{ color: "var(--a-text-3)" }}>
          {products.length.toLocaleString("uk-UA")} товарів
        </span>
      </div>

      {/* Auto-check summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#052e16", border: "1px solid #4ade8030" }}>
          <p className="text-xl font-bold" style={{ color: "#4ade80" }}>{descOk.toLocaleString("uk-UA")}</p>
          <p className="text-[10px] uppercase" style={{ color: "#4ade8090" }}>Опис ОК</p>
        </div>
        <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#422006", border: "1px solid #fbbf2430" }}>
          <p className="text-xl font-bold" style={{ color: "#fbbf24" }}>{descWarnings}</p>
          <p className="text-[10px] uppercase" style={{ color: "#fbbf2490" }}>Попередження</p>
        </div>
        <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#450a0a", border: "1px solid #f8717130" }}>
          <p className="text-xl font-bold" style={{ color: "#f87171" }}>{descErrors}</p>
          <p className="text-[10px] uppercase" style={{ color: "#f8717190" }}>Невідповідні (блок)</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mb-4 rounded-xl" style={{ border: "1px solid var(--a-border)" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "var(--a-bg-input)", borderBottom: "1px solid var(--a-border)" }}>
              <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--a-text-3)" }}>#</th>
              <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--a-text-3)" }}>SKU</th>
              <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--a-text-3)" }}>Назва (файл)</th>
              <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--a-text-3)" }}>Назва (база)</th>
              <th className="text-center px-3 py-2 font-semibold" style={{ color: "var(--a-text-3)" }}>Опис</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((p, idx) => {
              const mr = matchResults.find((m) => m.sku === p.sku);
              const dv = descVerification.get(p.sku) ?? "ok";
              const globalIdx = page * PAGE_SIZE + idx + 1;
              const isExpanded = expandedRow === p.sku;
              return (
                <tr key={p.sku}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => setExpandedRow(isExpanded ? null : p.sku)}
                  style={{ borderBottom: "1px solid var(--a-border-sub)", background: isExpanded ? "var(--a-bg-input)" : "transparent" }}>
                  <td className="px-3 py-2 font-mono" style={{ color: "var(--a-text-4)" }}>{globalIdx}</td>
                  <td className="px-3 py-2 font-mono" style={{ color: "var(--a-text-3)" }}>{p.sku}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: "var(--a-text-2)" }}>{p.name_uk}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: mr?.db_name ? "var(--a-text-2)" : "var(--a-text-5)" }}>
                    {mr?.db_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {dv === "ok" && <span style={{ color: "#4ade80" }}>OK</span>}
                    {dv === "warning" && <span style={{ color: "#fbbf24" }}>?</span>}
                    {dv === "error" && <span style={{ color: "#f87171" }}>X</span>}
                    {!p.description_uk && <span style={{ color: "var(--a-text-5)" }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mb-5">
          <button onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0}
            className="p-1.5 rounded-lg disabled:opacity-30" style={{ background: "var(--a-bg-input)", color: "var(--a-text-3)" }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs tabular-nums" style={{ color: "var(--a-text-3)" }}>
            Сторінка {page + 1} / {totalPages}
          </span>
          <button onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
            className="p-1.5 rounded-lg disabled:opacity-30" style={{ background: "var(--a-bg-input)", color: "var(--a-text-3)" }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>
        <div className="flex gap-3">
          <button onClick={onTestImport} disabled={loading || products.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: "#172554", color: "#60a5fa", border: "1px solid #60a5fa40" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Beaker className="w-4 h-4" />}
            Тестовий (20 товарів)
          </button>
          <button onClick={onFullImport} disabled={loading || products.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
            <Download className="w-4 h-4" />
            Імпортувати {products.length.toLocaleString("uk-UA")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Test Result Step                                                   */
/* ================================================================== */

function TestResultStep({ results, report, batchId, totalFiltered, onFullImport, onBack, loading }: {
  results: Array<{ id: string; name: string; slug: string; updated: boolean }>;
  report: PostImportReport; batchId: string | null; totalFiltered: number;
  onFullImport: () => void; onBack: () => void; loading: boolean;
}) {
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rolledBack, setRolledBack] = useState(false);

  const handleRollbackTest = async () => {
    if (!batchId) return;
    setRollbackLoading(true);
    try {
      const res = await fetch(`/api/admin/import/rollback/${batchId}`, { method: "POST" });
      if (res.ok) setRolledBack(true);
    } catch { /* ignore */ }
    setRollbackLoading(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Beaker className="w-5 h-5" style={{ color: "#60a5fa" }} />
        <h2 className="text-lg font-semibold" style={{ color: "var(--a-text)" }}>Тестовий імпорт завершено</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Оновлено" value={report.updated_products} color="#4ade80" />
        <StatCard label="Створено" value={report.new_products} color="#60a5fa" />
        <StatCard label="Пропущено" value={report.skipped} color="#fbbf24" />
      </div>

      {/* Product links */}
      <div className="rounded-xl p-4 mb-5" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
        <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>
          Перевірте на сайті:
        </h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {results.map((r, idx) => (
            <div key={r.id} className="flex items-center gap-2 text-sm">
              <span className="text-xs font-mono w-6 text-right" style={{ color: "var(--a-text-4)" }}>{idx + 1}.</span>
              <span className="flex-1 truncate" style={{ color: "var(--a-text-2)" }}>{r.name}</span>
              <a href={`/product/${r.slug}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs shrink-0"
                style={{ color: "#60a5fa", background: "#17255420" }}>
                <ExternalLink className="w-3 h-3" /> Переглянути
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex gap-3">
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
            style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
            <ArrowLeft className="w-4 h-4" /> Назад
          </button>
          {batchId && !rolledBack && (
            <button onClick={handleRollbackTest} disabled={rollbackLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: "#450a0a", color: "#f87171", border: "1px solid #f8717140" }}>
              {rollbackLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
              Відкатити тест
            </button>
          )}
          {rolledBack && (
            <span className="flex items-center gap-2 px-4 py-2 text-sm" style={{ color: "#4ade80" }}>
              <Check className="w-4 h-4" /> Тест відкачено
            </span>
          )}
        </div>
        <button onClick={onFullImport} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
          <Play className="w-4 h-4" />
          Запустити повний імпорт ({(totalFiltered - 20).toLocaleString("uk-UA")} товарів)
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Importing Step (with STOP)                                         */
/* ================================================================== */

function ImportingStep({ progress, onStop, isStopping }: {
  progress: { current: number; total: number; created: number; updated: number; skipped: number; errors: number } | null;
  onStop: () => void; isStopping: boolean;
}) {
  const pct = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  return (
    <div className="p-12 text-center">
      <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: "var(--a-accent)" }} />
      <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--a-text)" }}>
        {isStopping ? "Зупиняємо..." : "Імпортуємо товари..."}
      </h2>
      {progress ? (
        <div className="max-w-md mx-auto mt-4">
          <div className="relative h-5 rounded-full overflow-hidden mb-3" style={{ background: "var(--a-bg-input)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #7c3aed, #a855f7)" }} />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: "var(--a-text-2)" }}>{pct}%</span>
          </div>
          <p className="text-sm tabular-nums" style={{ color: "var(--a-text-3)" }}>
            {progress.current.toLocaleString("uk-UA")} / {progress.total.toLocaleString("uk-UA")} товарів
          </p>
          <div className="flex justify-center gap-4 mt-2 text-xs" style={{ color: "var(--a-text-4)" }}>
            <span>Оновлено: {progress.updated}</span>
            <span>Пропущено: {progress.skipped}</span>
            {progress.errors > 0 && <span style={{ color: "#f87171" }}>Помилки: {progress.errors}</span>}
          </div>
          {!isStopping && (
            <button onClick={onStop}
              className="mt-5 flex items-center gap-2 mx-auto px-5 py-2 rounded-lg text-sm font-medium"
              style={{ background: "#450a0a", color: "#f87171", border: "1px solid #f8717140" }}>
              <Square className="w-4 h-4" /> Зупинити імпорт
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--a-text-4)" }}>Підготовка...</p>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Normal flow steps (unchanged logic, condensed)                     */
/* ================================================================== */

function StructureStep({ structure, rows, loading, onConfirm, onEdit }: {
  structure: FileStructureResult; rows: string[][]; loading: boolean; onConfirm: () => void; onEdit: (s: FileStructureResult) => void;
}) {
  const cc = structure.confidence >= 0.9 ? "#4ade80" : structure.confidence >= 0.7 ? "#fbbf24" : "#f87171";
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5" style={{ color: "#a855f7" }} />
        <h2 className="text-lg font-semibold" style={{ color: "var(--a-text)" }}>AI проаналізував файл</h2>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold" style={{ color: cc, background: `${cc}20` }}>{Math.round(structure.confidence * 100)}%</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <InfoCard label="Тип файлу" value={structure.file_type} />
        <InfoCard label="Заголовки (рядок)" value={String(structure.header_row + 1)} />
        <InfoCard label="Початок даних" value={String(structure.data_start_row + 1)} />
        <InfoCard label="Активні колонки" value={structure.active_columns.join(", ")} />
      </div>
      {structure.notes && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg mb-4" style={{ background: "var(--a-bg-input)", color: "var(--a-text-3)" }}>
          <Info className="w-4 h-4 mt-0.5 shrink-0" /><span className="text-xs">{structure.notes}</span>
        </div>
      )}
      <div className="overflow-x-auto mb-4 rounded-lg" style={{ border: "1px solid var(--a-border)" }}>
        <table className="w-full text-xs"><tbody>
          {rows.slice(0, Math.min(structure.data_start_row + 5, 15)).map((row, i) => (
            <tr key={i} style={{ background: i === structure.header_row ? "var(--a-accent-bg)" : i >= structure.data_start_row ? "transparent" : "var(--a-bg-input)", borderBottom: "1px solid var(--a-border-sub)" }}>
              <td className="px-2 py-1 font-mono" style={{ color: "var(--a-text-5)", width: 40 }}>{i + 1}</td>
              {row.slice(0, 10).map((cell, j) => (
                <td key={j} className="px-2 py-1 max-w-[150px] truncate" style={{ color: i === structure.header_row ? "var(--a-accent)" : "var(--a-text-3)" }}>
                  {cell || <span style={{ color: "var(--a-text-6)" }}>—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody></table>
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        <label className="flex items-center gap-2 text-xs" style={{ color: "var(--a-text-3)" }}>
          Рядок заголовків:
          <input type="number" min={1} value={structure.header_row + 1} onChange={(e) => onEdit({ ...structure, header_row: Math.max(0, Number(e.target.value) - 1) })}
            className="w-16 px-2 py-1 rounded-lg text-xs" style={{ background: "var(--a-bg-input)", color: "var(--a-text-2)", border: "1px solid var(--a-border)" }} />
        </label>
        <label className="flex items-center gap-2 text-xs" style={{ color: "var(--a-text-3)" }}>
          Початок даних:
          <input type="number" min={1} value={structure.data_start_row + 1} onChange={(e) => onEdit({ ...structure, data_start_row: Math.max(0, Number(e.target.value) - 1) })}
            className="w-16 px-2 py-1 rounded-lg text-xs" style={{ background: "var(--a-bg-input)", color: "var(--a-text-2)", border: "1px solid var(--a-border)" }} />
        </label>
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={onConfirm} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--a-accent-btn)" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Далі: Маппінг
        </button>
      </div>
    </div>
  );
}

function MappingStep({ mappings, loading, onUpdate, onConfirm, onBack }: {
  mappings: ColumnMapping[]; loading: boolean; onUpdate: (m: ColumnMapping[]) => void; onConfirm: () => void; onBack: () => void;
}) {
  const updateMapping = (idx: number, field: DbField | null) => {
    const u = [...mappings]; u[idx] = { ...u[idx], db_field: field, confidence: field ? 1 : 0, reasoning: field ? "Вручну" : "" }; onUpdate(u);
  };
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5" style={{ color: "#a855f7" }} />
        <h2 className="text-lg font-semibold" style={{ color: "var(--a-text)" }}>Маппінг колонок</h2>
      </div>
      <div className="space-y-2 mb-6">
        {mappings.map((m, idx) => {
          const cc2 = m.confidence >= 0.9 ? "#4ade80" : m.confidence >= 0.7 ? "#fbbf24" : "#f87171";
          return (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border-sub)" }}>
              <div className="sm:w-[200px] shrink-0"><span className="text-sm font-mono" style={{ color: "var(--a-text-2)" }}>&quot;{m.file_column}&quot;</span></div>
              <ArrowRight className="w-4 h-4 hidden sm:block shrink-0" style={{ color: "var(--a-text-5)" }} />
              <div className="flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <select value={m.db_field ?? ""} onChange={(e) => updateMapping(idx, (e.target.value || null) as DbField | null)}
                    className="w-full px-3 py-1.5 pr-8 rounded-lg text-sm appearance-none" style={{ background: "var(--a-bg-card)", color: "var(--a-text-2)", border: "1px solid var(--a-border)" }}>
                    <option value="">Пропустити</option>
                    {DB_FIELDS.map((f) => <option key={f} value={f}>{DB_FIELD_LABELS[f]}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--a-text-4)" }} />
                </div>
                {m.confidence > 0 && <span className="text-xs font-bold shrink-0 px-1.5 py-0.5 rounded" style={{ color: cc2, background: `${cc2}15` }}>{Math.round(m.confidence * 100)}%</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>
        <button onClick={onConfirm} disabled={loading || mappings.filter((m) => m.db_field).length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--a-accent-btn)" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Далі: Валідація
        </button>
      </div>
    </div>
  );
}

function ValidationStep({ issues, loading, onUpdate, onConfirm, onBack }: {
  issues: ValidationIssue[]; loading: boolean; onUpdate: (v: ValidationIssue[]) => void; onConfirm: () => void; onBack: () => void;
}) {
  const critical = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");
  const toggleIssue = (idx: number) => { const u = [...issues]; u[idx] = { ...u[idx], accepted: !u[idx].accepted }; onUpdate(u); };
  const acceptAll = () => onUpdate(issues.map((i) => ({ ...i, accepted: true })));

  if (issues.length === 0) {
    return (
      <div className="p-8 text-center">
        <Check className="w-12 h-12 mx-auto mb-3" style={{ color: "#4ade80" }} />
        <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--a-text)" }}>Все чисто!</h2>
        <div className="flex justify-between mt-6">
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}><ArrowLeft className="w-4 h-4" /> Назад</button>
          <button onClick={onConfirm} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--a-accent-btn)" }}><ArrowRight className="w-4 h-4" /> Далі</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5" style={{ color: "#a855f7" }} />
        <h2 className="text-lg font-semibold" style={{ color: "var(--a-text)" }}>Валідація</h2>
        <span className="ml-auto text-xs" style={{ color: "var(--a-text-3)" }}>{issues.length} рекомендацій</span>
      </div>
      {critical.length > 0 && <IssueGroup label="Критичні" count={critical.length} color="#f87171" bg="#450a0a" issues={critical} allIssues={issues} onToggle={toggleIssue} />}
      {warnings.length > 0 && <IssueGroup label="Попередження" count={warnings.length} color="#fbbf24" bg="#422006" issues={warnings} allIssues={issues} onToggle={toggleIssue} />}
      {infos.length > 0 && <IssueGroup label="Інфо" count={infos.length} color="#60a5fa" bg="#172554" issues={infos} allIssues={issues} onToggle={toggleIssue} />}
      <button onClick={acceptAll} className="px-3 py-1.5 rounded-lg text-xs font-medium mb-4" style={{ background: "#052e16", color: "#4ade80", border: "1px solid #4ade8040" }}>Прийняти всі</button>
      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}><ArrowLeft className="w-4 h-4" /> Назад</button>
        <button onClick={onConfirm} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--a-accent-btn)" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Далі
        </button>
      </div>
    </div>
  );
}

function IssueGroup({ label, count, color, bg, issues, allIssues, onToggle }: {
  label: string; count: number; color: string; bg: string; issues: ValidationIssue[]; allIssues: ValidationIssue[]; onToggle: (idx: number) => void;
}) {
  return (
    <div className="rounded-xl p-3 mb-3" style={{ background: bg, border: `1px solid ${color}30` }}>
      <h3 className="text-xs font-semibold mb-2" style={{ color }}>{label} ({count})</h3>
      <div className="space-y-1.5">
        {issues.map((issue) => {
          const gi = allIssues.indexOf(issue);
          return (
            <div key={gi} className="flex items-start gap-2 text-xs rounded-lg px-3 py-2" style={{ background: `${color}08`, color: "var(--a-text-2)" }}>
              <span className="font-mono shrink-0" style={{ color: "var(--a-text-4)" }}>#{issue.row}</span>
              <div className="flex-1 min-w-0"><span>{issue.issue}</span>
                {issue.suggestion && <span className="block mt-0.5" style={{ color: "var(--a-text-4)" }}>{issue.suggestion}</span>}
              </div>
              <button onClick={() => onToggle(gi)} className="px-2 py-0.5 rounded text-[10px] font-medium"
                style={issue.accepted ? { background: "#052e16", color: "#4ade80" } : { background: "var(--a-bg-input)", color: "var(--a-text-3)" }}>
                {issue.accepted ? "OK" : "Прийняти"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PreviewStep({ file, structure, mappings, importMode, duplicateStrategy, matchField, onModeChange, onDuplicateChange, onMatchChange, onConfirm, onBack, loading }: {
  file: ParsedFile; structure: FileStructureResult; mappings: ColumnMapping[];
  importMode: "create" | "update" | "create_or_update"; duplicateStrategy: "skip" | "update" | "create_new";
  matchField: "sku" | "name" | "barcode" | "supplier_sku";
  onModeChange: (m: typeof importMode) => void; onDuplicateChange: (d: typeof duplicateStrategy) => void; onMatchChange: (f: typeof matchField) => void;
  onConfirm: () => void; onBack: () => void; loading: boolean;
}) {
  const activeMappings = mappings.filter((m) => m.db_field);
  const dataRows = file.total_rows - structure.data_start_row - (structure.skip_rows?.length ?? 0);
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--a-text)" }}>Перегляд</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <InfoCard label="Файл" value={file.filename} />
        <InfoCard label="Рядків" value={String(dataRows)} />
        <InfoCard label="Полів" value={`${activeMappings.length}/${mappings.length}`} />
        <InfoCard label="Лист" value={file.active_sheet} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <SelectCard label="Режим" value={importMode} onChange={(v) => onModeChange(v as typeof importMode)} options={[{ value: "create_or_update", label: "Створити/оновити" }, { value: "create", label: "Тільки створити" }, { value: "update", label: "Тільки оновити" }]} />
        <SelectCard label="Дублікати" value={duplicateStrategy} onChange={(v) => onDuplicateChange(v as typeof duplicateStrategy)} options={[{ value: "update", label: "Оновити" }, { value: "skip", label: "Пропустити" }, { value: "create_new", label: "Створити новий" }]} />
        <SelectCard label="Шукати по" value={matchField} onChange={(v) => onMatchChange(v as typeof matchField)} options={[{ value: "sku", label: "SKU" }, { value: "name", label: "Назва" }, { value: "barcode", label: "Штрих-код" }, { value: "supplier_sku", label: "Артикул постачальника" }]} />
      </div>
      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}><ArrowLeft className="w-4 h-4" /> Назад</button>
        <button onClick={onConfirm} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Імпортувати {dataRows}
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Report Step                                                        */
/* ================================================================== */

function ReportStep({ report, batchId, externalImageCount, onNewImport }: {
  report: PostImportReport; batchId: string | null; externalImageCount?: number; onNewImport: () => void;
}) {
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackResult, setRollbackResult] = useState<{ deleted: number; restored: number } | null>(null);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  const handleRollback = async () => {
    if (!batchId || !confirm("Ви впевнені? Оновлені товари будуть повернуті до попередніх значень.")) return;
    setRollbackLoading(true); setRollbackError(null);
    try {
      const res = await fetch(`/api/admin/import/rollback/${batchId}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Rollback failed");
      setRollbackResult(json.rolled_back);
    } catch (err) { setRollbackError(err instanceof Error ? err.message : "Помилка відкату"); }
    setRollbackLoading(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Check className="w-6 h-6" style={{ color: "#4ade80" }} />
        <h2 className="text-lg font-semibold" style={{ color: "var(--a-text)" }}>Імпорт завершено!</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Імпортовано" value={report.total_imported} color="#4ade80" />
        <StatCard label="Нових" value={report.new_products} color="#60a5fa" />
        <StatCard label="Оновлено" value={report.updated_products} color="#fbbf24" />
        <StatCard label="Пропущено" value={report.skipped} color="#f87171" />
      </div>

      {report.recommendations.length > 0 && (
        <div className="rounded-xl p-3 mb-6" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
          <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>Рекомендації</h3>
          <div className="space-y-1.5">
            {report.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--a-text-2)" }}>
                <span>{r.type === "critical" ? "X" : r.type === "warning" ? "!" : "i"}</span>
                <span>{r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {batchId && !rollbackResult && (
        <div className="rounded-xl p-4 mb-6" style={{ background: "#450a0a20", border: "1px solid #f8717130" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>Відкат імпорту</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--a-text-4)" }}>Відкат можливий протягом 24 годин</p>
            </div>
            <button onClick={handleRollback} disabled={rollbackLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 shrink-0"
              style={{ background: "#450a0a", color: "#f87171", border: "1px solid #f8717140" }}>
              {rollbackLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />} Відкатити
            </button>
          </div>
          {rollbackError && <p className="text-xs mt-2" style={{ color: "#f87171" }}>{rollbackError}</p>}
        </div>
      )}
      {rollbackResult && (
        <div className="rounded-xl p-4 mb-6" style={{ background: "#052e1640", border: "1px solid #4ade8030" }}>
          <div className="flex items-center gap-2 mb-1">
            <Undo2 className="w-4 h-4" style={{ color: "#4ade80" }} />
            <p className="text-sm font-medium" style={{ color: "#4ade80" }}>Імпорт відкачено</p>
          </div>
          <p className="text-xs" style={{ color: "var(--a-text-3)" }}>
            Видалено: {rollbackResult.deleted}, відновлено: {rollbackResult.restored}
          </p>
        </div>
      )}

      {(externalImageCount ?? 0) > 0 && (
        <Link href="/admin/import/migrate-images"
          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6 transition-colors hover:opacity-80"
          style={{ background: "#7c3aed15", border: "1px solid #a855f730" }}>
          <ImageIcon className="w-5 h-5" style={{ color: "#a855f7" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>Міграція фото в Storage</p>
            <p className="text-xs" style={{ color: "var(--a-text-4)" }}>{externalImageCount?.toLocaleString("uk-UA")} товарів з зовнішніми фото</p>
          </div>
          <ArrowRight className="w-4 h-4 ml-auto" style={{ color: "#a855f7" }} />
        </Link>
      )}

      <div className="flex justify-center">
        <button onClick={onNewImport} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--a-accent-btn)" }}>
          <Upload className="w-4 h-4" /> Новий імпорт
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Shared UI                                                          */
/* ================================================================== */

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border-sub)" }}>
      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--a-text-5)" }}>{label}</p>
      <p className="text-sm font-medium truncate" style={{ color: "var(--a-text-2)" }}>{value}</p>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl px-4 py-3 text-center" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value.toLocaleString("uk-UA")}</p>
      <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: `${color}90` }}>{label}</p>
    </div>
  );
}

function SelectCard({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border-sub)" }}>
      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--a-text-5)" }}>{label}</p>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full text-sm appearance-none bg-transparent pr-6" style={{ color: "var(--a-text-2)" }}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--a-text-4)" }} />
      </div>
    </div>
  );
}
