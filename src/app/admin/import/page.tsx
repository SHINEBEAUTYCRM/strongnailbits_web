"use client";

import { useState, useCallback } from "react";
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
  Download,
  Sparkles,
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

/* ================================================================== */
/*  Import Wizard Page                                                */
/* ================================================================== */

const STEPS: { key: ImportStep; label: string }[] = [
  { key: "upload", label: "Завантаження" },
  { key: "structure", label: "Структура" },
  { key: "mapping", label: "Маппінг" },
  { key: "validation", label: "Валідація" },
  { key: "preview", label: "Попередній перегляд" },
  { key: "importing", label: "Імпорт" },
  { key: "report", label: "Звіт" },
];

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI toggle
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiFeatures, setAiFeatures] = useState({
    structure: true,
    mapping: true,
    validation: true,
    enrichment: false,
    report: true,
  });

  // Data state
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [structure, setStructure] = useState<FileStructureResult | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [enrichments, setEnrichments] = useState<EnrichmentSuggestion[]>([]);
  const [report, setReport] = useState<PostImportReport | null>(null);

  // Import settings
  const [importMode, setImportMode] = useState<"create" | "update" | "create_or_update">("create_or_update");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "update" | "create_new">("update");
  const [matchField, setMatchField] = useState<"sku" | "name" | "barcode" | "supplier_sku">("sku");

  const currentStepIdx = STEPS.findIndex((s) => s.key === step);

  /* ---------------------------------------------------------------- */
  /*  Step 1: Upload file                                              */
  /* ---------------------------------------------------------------- */
  const handleUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/import/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setParsedFile(json.file);
      setStep("structure");

      // Auto-run structure analysis
      await analyzeStructure(json.file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    }
    setLoading(false);
  }, [aiEnabled, aiFeatures.structure]);

  /* ---------------------------------------------------------------- */
  /*  Step 2: Analyze structure                                        */
  /* ---------------------------------------------------------------- */
  const analyzeStructure = useCallback(async (file: ParsedFile) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/import/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "structure",
          data: { rows: file.raw_rows },
          context: { ai_enabled: aiEnabled && aiFeatures.structure },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setStructure(json.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка аналізу структури");
    }
    setLoading(false);
  }, [aiEnabled, aiFeatures.structure]);

  /* ---------------------------------------------------------------- */
  /*  Step 3: Column mapping                                           */
  /* ---------------------------------------------------------------- */
  const runMapping = useCallback(async () => {
    if (!parsedFile || !structure) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/import/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "mapping",
          data: {
            rows: parsedFile.raw_rows,
            header_row: structure.header_row,
            data_start_row: structure.data_start_row,
          },
          context: { ai_enabled: aiEnabled && aiFeatures.mapping },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMappings(json.result);
      setStep("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка маппінгу");
    }
    setLoading(false);
  }, [parsedFile, structure, aiEnabled, aiFeatures.mapping]);

  /* ---------------------------------------------------------------- */
  /*  Step 4: Validation                                               */
  /* ---------------------------------------------------------------- */
  const runValidation = useCallback(async () => {
    if (!parsedFile || !structure) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/import/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "validation",
          data: {
            rows: parsedFile.raw_rows,
            mappings,
            header_row: structure.header_row,
            data_start_row: structure.data_start_row,
          },
          context: { ai_enabled: aiEnabled && aiFeatures.validation },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setValidationIssues(json.result);
      setStep("validation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка валідації");
    }
    setLoading(false);
  }, [parsedFile, structure, mappings, aiEnabled, aiFeatures.validation]);

  /* ---------------------------------------------------------------- */
  /*  Step 6: Execute import                                           */
  /* ---------------------------------------------------------------- */
  const executeImport = useCallback(async () => {
    if (!parsedFile || !structure) return;
    setStep("importing");
    setLoading(true);
    setError(null);
    try {
      const acceptedFixes = validationIssues
        .filter((v) => v.accepted && v.suggested_value)
        .map((v) => ({ row: v.row, field: v.field, value: v.suggested_value! }));

      const res = await fetch("/api/admin/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappings,
          structure,
          rows: parsedFile.raw_rows,
          validation_fixes: acceptedFixes,
          enrichments: enrichments.filter((e) => e.accepted),
          import_mode: importMode,
          duplicate_strategy: duplicateStrategy,
          match_field: matchField,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setReport(json.report);
      setStep("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка імпорту");
      setStep("preview");
    }
    setLoading(false);
  }, [parsedFile, structure, mappings, validationIssues, enrichments, importMode, duplicateStrategy, matchField]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
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

        {/* AI Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAiEnabled(!aiEnabled)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={
              aiEnabled
                ? { background: "linear-gradient(135deg, #7c3aed20, #a855f720)", color: "#a855f7", border: "1px solid #a855f740" }
                : { background: "var(--a-bg-input)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }
            }
          >
            <Brain className="w-4 h-4" />
            AI-асистент: {aiEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {STEPS.map((s, idx) => {
          const isActive = idx === currentStepIdx;
          const isDone = idx < currentStepIdx;
          return (
            <div key={s.key} className="flex items-center">
              {idx > 0 && (
                <div className="w-6 h-px mx-1" style={{ background: isDone ? "var(--a-accent)" : "var(--a-border)" }} />
              )}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                style={
                  isActive
                    ? { background: "var(--a-accent-bg)", color: "var(--a-accent)", border: "1px solid var(--a-accent)" }
                    : isDone
                      ? { background: "#052e16", color: "#4ade80", border: "1px solid #4ade8040" }
                      : { background: "var(--a-bg-input)", color: "var(--a-text-4)", border: "1px solid var(--a-border)" }
                }
              >
                {isDone ? <Check className="w-3 h-3" /> : <span className="w-3 text-center">{idx + 1}</span>}
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4" style={{ background: "#450a0a", border: "1px solid #f8717140", color: "#f87171" }}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* AI features panel */}
      {aiEnabled && step === "upload" && (
        <div className="rounded-xl p-4 mb-6" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "var(--a-card-shadow)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: "#a855f7" }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>
              AI-функції
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {([
              { key: "structure" as const, label: "Розпізнавання структури файлу" },
              { key: "mapping" as const, label: "Інтелектуальний маппінг колонок" },
              { key: "validation" as const, label: "Розумна валідація" },
              { key: "enrichment" as const, label: "Збагачення даних (описи, SEO)" },
              { key: "report" as const, label: "Пост-імпорт аналітика" },
            ] as const).map((f) => (
              <label key={f.key} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm"
                style={{ background: "var(--a-bg-input)", color: aiFeatures[f.key] ? "var(--a-text-2)" : "var(--a-text-4)" }}>
                <input
                  type="checkbox"
                  checked={aiFeatures[f.key]}
                  onChange={(e) => setAiFeatures((p) => ({ ...p, [f.key]: e.target.checked }))}
                  className="accent-purple-500"
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "var(--a-card-shadow)" }}>
        {step === "upload" && <UploadStep loading={loading} onUpload={handleUpload} />}
        {step === "structure" && structure && parsedFile && (
          <StructureStep
            structure={structure}
            rows={parsedFile.raw_rows}
            loading={loading}
            onConfirm={() => runMapping()}
            onEdit={(s) => setStructure(s)}
          />
        )}
        {step === "mapping" && (
          <MappingStep
            mappings={mappings}
            loading={loading}
            onUpdate={setMappings}
            onConfirm={() => runValidation()}
            onBack={() => setStep("structure")}
          />
        )}
        {step === "validation" && (
          <ValidationStep
            issues={validationIssues}
            loading={loading}
            onUpdate={setValidationIssues}
            onConfirm={() => setStep("preview")}
            onBack={() => setStep("mapping")}
          />
        )}
        {step === "preview" && parsedFile && structure && (
          <PreviewStep
            file={parsedFile}
            structure={structure}
            mappings={mappings}
            importMode={importMode}
            duplicateStrategy={duplicateStrategy}
            matchField={matchField}
            onModeChange={setImportMode}
            onDuplicateChange={setDuplicateStrategy}
            onMatchChange={setMatchField}
            onConfirm={executeImport}
            onBack={() => setStep("validation")}
            loading={loading}
          />
        )}
        {step === "importing" && <ImportingStep />}
        {step === "report" && report && <ReportStep report={report} onNewImport={() => {
          setStep("upload");
          setParsedFile(null);
          setStructure(null);
          setMappings([]);
          setValidationIssues([]);
          setEnrichments([]);
          setReport(null);
        }} />}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function UploadStep({ loading, onUpload }: { loading: boolean; onUpload: (f: File) => void }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="p-8">
      <div
        className="border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer"
        style={{
          borderColor: dragOver ? "var(--a-accent)" : "var(--a-border)",
          background: dragOver ? "var(--a-accent-bg)" : "transparent",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) onUpload(file);
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".xlsx,.xls,.csv,.tsv,.txt";
          input.onchange = () => {
            const file = input.files?.[0];
            if (file) onUpload(file);
          };
          input.click();
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--a-accent)" }} />
            <p className="text-sm" style={{ color: "var(--a-text-2)" }}>Обробка файлу...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10" style={{ color: "var(--a-text-4)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>
              Перетягніть файл сюди або натисніть для вибору
            </p>
            <p className="text-xs" style={{ color: "var(--a-text-4)" }}>
              Excel (.xlsx, .xls) або CSV (.csv, .tsv) — до 20 МБ
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Structure step                                                     */
/* ------------------------------------------------------------------ */

function StructureStep({
  structure,
  rows,
  loading,
  onConfirm,
  onEdit,
}: {
  structure: FileStructureResult;
  rows: string[][];
  loading: boolean;
  onConfirm: () => void;
  onEdit: (s: FileStructureResult) => void;
}) {
  const confidenceColor =
    structure.confidence >= 0.9 ? "#4ade80" : structure.confidence >= 0.7 ? "#fbbf24" : "#f87171";

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5" style={{ color: "#a855f7" }} />
        <h2 className="text-lg font-semibold" style={{ color: "var(--a-text)" }}>
          AI проаналізував файл
        </h2>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ color: confidenceColor, background: `${confidenceColor}20` }}>
          {Math.round(structure.confidence * 100)}%
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <InfoCard label="Тип файлу" value={structure.file_type} />
        <InfoCard label="Заголовки (рядок)" value={String(structure.header_row + 1)} />
        <InfoCard label="Початок даних (рядок)" value={String(structure.data_start_row + 1)} />
        <InfoCard label="Активні колонки" value={structure.active_columns.join(", ")} />
      </div>

      {structure.notes && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg mb-4" style={{ background: "var(--a-bg-input)", color: "var(--a-text-3)" }}>
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="text-xs">{structure.notes}</span>
        </div>
      )}

      {/* Preview table */}
      <div className="overflow-x-auto mb-4 rounded-lg" style={{ border: "1px solid var(--a-border)" }}>
        <table className="w-full text-xs">
          <tbody>
            {rows.slice(0, Math.min(structure.data_start_row + 5, 15)).map((row, i) => (
              <tr key={i} style={{
                background: i === structure.header_row ? "var(--a-accent-bg)" :
                  i >= structure.data_start_row ? "transparent" : "var(--a-bg-input)",
                borderBottom: "1px solid var(--a-border-sub)"
              }}>
                <td className="px-2 py-1 font-mono" style={{ color: "var(--a-text-5)", width: 40 }}>{i + 1}</td>
                {row.slice(0, 10).map((cell, j) => (
                  <td key={j} className="px-2 py-1 max-w-[150px] truncate" style={{
                    color: i === structure.header_row ? "var(--a-accent)" : "var(--a-text-3)"
                  }}>
                    {cell || <span style={{ color: "var(--a-text-6)" }}>—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manual edit */}
      <div className="flex flex-wrap gap-3 mb-4">
        <label className="flex items-center gap-2 text-xs" style={{ color: "var(--a-text-3)" }}>
          Рядок заголовків:
          <input
            type="number"
            min={1}
            value={structure.header_row + 1}
            onChange={(e) => onEdit({ ...structure, header_row: Math.max(0, Number(e.target.value) - 1) })}
            className="w-16 px-2 py-1 rounded-lg text-xs"
            style={{ background: "var(--a-bg-input)", color: "var(--a-text-2)", border: "1px solid var(--a-border)" }}
          />
        </label>
        <label className="flex items-center gap-2 text-xs" style={{ color: "var(--a-text-3)" }}>
          Початок даних:
          <input
            type="number"
            min={1}
            value={structure.data_start_row + 1}
            onChange={(e) => onEdit({ ...structure, data_start_row: Math.max(0, Number(e.target.value) - 1) })}
            className="w-16 px-2 py-1 rounded-lg text-xs"
            style={{ background: "var(--a-bg-input)", color: "var(--a-text-2)", border: "1px solid var(--a-border)" }}
          />
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--a-accent-btn)" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          Далі: Маппінг колонок
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mapping step                                                       */
/* ------------------------------------------------------------------ */

function MappingStep({
  mappings,
  loading,
  onUpdate,
  onConfirm,
  onBack,
}: {
  mappings: ColumnMapping[];
  loading: boolean;
  onUpdate: (m: ColumnMapping[]) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const updateMapping = (idx: number, field: DbField | null) => {
    const updated = [...mappings];
    updated[idx] = { ...updated[idx], db_field: field, confidence: field ? 1 : 0, reasoning: field ? "Встановлено вручну" : "" };
    onUpdate(updated);
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5" style={{ color: "#a855f7" }} />
        <h2 className="text-lg font-semibold" style={{ color: "var(--a-text)" }}>
          Маппінг колонок
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--a-accent-bg)", color: "var(--a-accent)" }}>
          AI-асистент
        </span>
      </div>

      <div className="space-y-2 mb-6">
        {mappings.map((m, idx) => {
          const confidenceIcon =
            m.confidence >= 0.9 ? "✅" : m.confidence >= 0.7 ? "⚡" : m.confidence > 0 ? "⚠️" : "";
          const confidenceColor =
            m.confidence >= 0.9 ? "#4ade80" : m.confidence >= 0.7 ? "#fbbf24" : "#f87171";

          return (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 rounded-xl"
              style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border-sub)" }}>
              <div className="sm:w-[200px] shrink-0">
                <span className="text-sm font-mono" style={{ color: "var(--a-text-2)" }}>
                  &quot;{m.file_column}&quot;
                </span>
              </div>

              <ArrowRight className="w-4 h-4 hidden sm:block shrink-0" style={{ color: "var(--a-text-5)" }} />

              <div className="flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={m.db_field ?? ""}
                    onChange={(e) => updateMapping(idx, (e.target.value || null) as DbField | null)}
                    className="w-full px-3 py-1.5 pr-8 rounded-lg text-sm appearance-none"
                    style={{ background: "var(--a-bg-card)", color: "var(--a-text-2)", border: "1px solid var(--a-border)" }}
                  >
                    <option value="">⊘ Пропустити</option>
                    {DB_FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {DB_FIELD_LABELS[f]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--a-text-4)" }} />
                </div>

                {m.confidence > 0 && (
                  <span className="text-xs font-bold shrink-0 px-1.5 py-0.5 rounded"
                    style={{ color: confidenceColor, background: `${confidenceColor}15` }}>
                    {confidenceIcon} {Math.round(m.confidence * 100)}%
                  </span>
                )}
              </div>

              {m.reasoning && (
                <div className="sm:hidden text-[11px] mt-1 pl-1" style={{ color: "var(--a-text-4)" }}>
                  💡 {m.reasoning}
                </div>
              )}
              {m.reasoning && (
                <div className="hidden sm:block text-[11px] max-w-[300px] shrink-0" style={{ color: "var(--a-text-4)" }} title={m.reasoning}>
                  💡 {m.reasoning.length > 60 ? m.reasoning.slice(0, 60) + "…" : m.reasoning}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-[10px]" style={{ color: "var(--a-text-4)" }}>
        <span>✅ впевненість &gt; 90%</span>
        <span>⚡ потребує перевірки (70-90%)</span>
        <span>⚠️ низька впевненість (&lt; 70%)</span>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>
        <button
          onClick={onConfirm}
          disabled={loading || mappings.filter((m) => m.db_field).length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--a-accent-btn)" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          Далі: Валідація
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Validation step                                                    */
/* ------------------------------------------------------------------ */

function ValidationStep({
  issues,
  loading,
  onUpdate,
  onConfirm,
  onBack,
}: {
  issues: ValidationIssue[];
  loading: boolean;
  onUpdate: (v: ValidationIssue[]) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const critical = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");

  const toggleIssue = (idx: number) => {
    const updated = [...issues];
    updated[idx] = { ...updated[idx], accepted: !updated[idx].accepted };
    onUpdate(updated);
  };

  const acceptAll = (severity?: string) => {
    onUpdate(
      issues.map((i) => ({
        ...i,
        accepted: severity ? (i.severity === severity ? true : i.accepted) : true,
      }))
    );
  };

  if (issues.length === 0) {
    return (
      <div className="p-8 text-center">
        <Check className="w-12 h-12 mx-auto mb-3" style={{ color: "#4ade80" }} />
        <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--a-text)" }}>Все чисто!</h2>
        <p className="text-sm mb-6" style={{ color: "var(--a-text-4)" }}>Проблем не знайдено. Можна продовжувати.</p>
        <div className="flex justify-between">
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
            style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
            <ArrowLeft className="w-4 h-4" /> Назад
          </button>
          <button onClick={onConfirm} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "var(--a-accent-btn)" }}>
            <ArrowRight className="w-4 h-4" /> Далі: Попередній перегляд
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5" style={{ color: "#a855f7" }} />
        <h2 className="text-lg font-semibold" style={{ color: "var(--a-text)" }}>AI-валідація</h2>
        <span className="ml-auto text-xs" style={{ color: "var(--a-text-3)" }}>
          {issues.length} рекомендацій
        </span>
      </div>

      {/* Issue groups */}
      {critical.length > 0 && (
        <IssueGroup label="Критичні" count={critical.length} color="#f87171" bg="#450a0a" issues={critical} allIssues={issues} onToggle={toggleIssue} />
      )}
      {warnings.length > 0 && (
        <IssueGroup label="Попередження" count={warnings.length} color="#fbbf24" bg="#422006" issues={warnings} allIssues={issues} onToggle={toggleIssue} />
      )}
      {infos.length > 0 && (
        <IssueGroup label="Інформаційні" count={infos.length} color="#60a5fa" bg="#172554" issues={infos} allIssues={issues} onToggle={toggleIssue} />
      )}

      {/* Bulk actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => acceptAll()} className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: "#052e16", color: "#4ade80", border: "1px solid #4ade8040" }}>
          ✅ Прийняти всі рекомендації
        </button>
        {critical.length > 0 && (
          <button onClick={() => acceptAll("critical")} className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "#450a0a", color: "#f87171", border: "1px solid #f8717140" }}>
            ✅ Прийняти тільки критичні
          </button>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--a-accent-btn)" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          Далі: Попередній перегляд
        </button>
      </div>
    </div>
  );
}

function IssueGroup({
  label,
  count,
  color,
  bg,
  issues,
  allIssues,
  onToggle,
}: {
  label: string;
  count: number;
  color: string;
  bg: string;
  issues: ValidationIssue[];
  allIssues: ValidationIssue[];
  onToggle: (idx: number) => void;
}) {
  return (
    <div className="rounded-xl p-3 mb-3" style={{ background: bg, border: `1px solid ${color}30` }}>
      <h3 className="text-xs font-semibold mb-2" style={{ color }}>
        {label} ({count})
      </h3>
      <div className="space-y-1.5">
        {issues.map((issue) => {
          const globalIdx = allIssues.indexOf(issue);
          return (
            <div key={globalIdx} className="flex items-start gap-2 text-xs rounded-lg px-3 py-2"
              style={{ background: `${color}08`, color: "var(--a-text-2)" }}>
              <span className="font-mono shrink-0" style={{ color: "var(--a-text-4)" }}>#{issue.row}</span>
              <div className="flex-1 min-w-0">
                <span>{issue.issue}</span>
                {issue.suggestion && (
                  <span className="block mt-0.5" style={{ color: "var(--a-text-4)" }}>
                    💡 {issue.suggestion}
                    {issue.suggested_value && <span className="font-mono ml-1">→ {issue.suggested_value}</span>}
                  </span>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onToggle(globalIdx)}
                  className="px-2 py-0.5 rounded text-[10px] font-medium"
                  style={issue.accepted
                    ? { background: "#052e16", color: "#4ade80" }
                    : { background: "var(--a-bg-input)", color: "var(--a-text-3)" }}>
                  {issue.accepted ? "✅" : "Прийняти"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview step                                                       */
/* ------------------------------------------------------------------ */

function PreviewStep({
  file,
  structure,
  mappings,
  importMode,
  duplicateStrategy,
  matchField,
  onModeChange,
  onDuplicateChange,
  onMatchChange,
  onConfirm,
  onBack,
  loading,
}: {
  file: ParsedFile;
  structure: FileStructureResult;
  mappings: ColumnMapping[];
  importMode: "create" | "update" | "create_or_update";
  duplicateStrategy: "skip" | "update" | "create_new";
  matchField: "sku" | "name" | "barcode" | "supplier_sku";
  onModeChange: (m: "create" | "update" | "create_or_update") => void;
  onDuplicateChange: (d: "skip" | "update" | "create_new") => void;
  onMatchChange: (f: "sku" | "name" | "barcode" | "supplier_sku") => void;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const activeMappings = mappings.filter((m) => m.db_field);
  const dataRows = file.total_rows - structure.data_start_row - (structure.skip_rows?.length ?? 0);

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--a-text)" }}>
        Попередній перегляд імпорту
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <InfoCard label="Файл" value={file.filename} />
        <InfoCard label="Рядків даних" value={String(dataRows)} />
        <InfoCard label="Зіставлених полів" value={`${activeMappings.length} з ${mappings.length}`} />
        <InfoCard label="Лист" value={file.active_sheet} />
      </div>

      {/* Import settings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <SelectCard
          label="Режим імпорту"
          value={importMode}
          onChange={(v) => onModeChange(v as typeof importMode)}
          options={[
            { value: "create_or_update", label: "Створити або оновити" },
            { value: "create", label: "Тільки створити нові" },
            { value: "update", label: "Тільки оновити існуючі" },
          ]}
        />
        <SelectCard
          label="Дублікати"
          value={duplicateStrategy}
          onChange={(v) => onDuplicateChange(v as typeof duplicateStrategy)}
          options={[
            { value: "update", label: "Оновити існуючий" },
            { value: "skip", label: "Пропустити" },
            { value: "create_new", label: "Створити новий" },
          ]}
        />
        <SelectCard
          label="Шукати по"
          value={matchField}
          onChange={(v) => onMatchChange(v as typeof matchField)}
          options={[
            { value: "sku", label: "SKU (артикул)" },
            { value: "name", label: "Назва" },
            { value: "barcode", label: "Штрих-код" },
            { value: "supplier_sku", label: "Артикул постачальника" },
          ]}
        />
      </div>

      {/* Mapped fields summary */}
      <div className="rounded-xl p-3 mb-6" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>
          Зіставлення полів
        </h3>
        <div className="flex flex-wrap gap-2">
          {activeMappings.map((m, i) => (
            <span key={i} className="px-2 py-1 rounded-lg text-[11px]"
              style={{ background: "var(--a-bg-card)", color: "var(--a-text-2)", border: "1px solid var(--a-border)" }}>
              {m.file_column} → <strong>{DB_FIELD_LABELS[m.db_field!]}</strong>
            </span>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Імпортувати {dataRows} товарів
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Importing step (loading)                                           */
/* ------------------------------------------------------------------ */

function ImportingStep() {
  return (
    <div className="p-12 text-center">
      <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: "var(--a-accent)" }} />
      <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--a-text)" }}>Імпортуємо товари...</h2>
      <p className="text-sm" style={{ color: "var(--a-text-4)" }}>Це може зайняти кілька хвилин для великих файлів</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Report step                                                        */
/* ------------------------------------------------------------------ */

function ReportStep({ report, onNewImport }: { report: PostImportReport; onNewImport: () => void }) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Check className="w-6 h-6" style={{ color: "#4ade80" }} />
        <h2 className="text-lg font-semibold" style={{ color: "var(--a-text)" }}>Імпорт завершено!</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Імпортовано" value={report.total_imported} color="#4ade80" />
        <StatCard label="Нових" value={report.new_products} color="#60a5fa" />
        <StatCard label="Оновлено" value={report.updated_products} color="#fbbf24" />
        <StatCard label="Пропущено" value={report.skipped} color="#f87171" />
      </div>

      {/* Price changes */}
      {(report.price_changes.increased_above_15 > 0 || report.price_changes.decreased_above_20 > 0) && (
        <div className="rounded-xl p-3 mb-4" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
          <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>
            Цінові зміни
          </h3>
          <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--a-text-2)" }}>
            <span>Середня зміна: {report.price_changes.average_change_percent > 0 ? "+" : ""}{report.price_changes.average_change_percent}%</span>
            {report.price_changes.increased_above_15 > 0 && (
              <span style={{ color: "#f87171" }}>⬆ Подорожчали &gt;15%: {report.price_changes.increased_above_15}</span>
            )}
            {report.price_changes.decreased_above_20 > 0 && (
              <span style={{ color: "#4ade80" }}>⬇ Подешевшали &gt;20%: {report.price_changes.decreased_above_20}</span>
            )}
          </div>
        </div>
      )}

      {/* Stock changes */}
      {(report.stock_changes.went_out_of_stock > 0 || report.stock_changes.back_in_stock > 0) && (
        <div className="rounded-xl p-3 mb-4" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
          <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>
            Зміни залишків
          </h3>
          <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--a-text-2)" }}>
            {report.stock_changes.went_out_of_stock > 0 && (
              <span style={{ color: "#f87171" }}>Зникли з наявності: {report.stock_changes.went_out_of_stock}</span>
            )}
            {report.stock_changes.back_in_stock > 0 && (
              <span style={{ color: "#4ade80" }}>Знову в наявності: {report.stock_changes.back_in_stock}</span>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="rounded-xl p-3 mb-6" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}>
          <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>
            Рекомендації
          </h3>
          <div className="space-y-1.5">
            {report.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--a-text-2)" }}>
                <span>{r.type === "critical" ? "🔴" : r.type === "warning" ? "🟡" : "🔵"}</span>
                <span>{r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button onClick={onNewImport}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--a-accent-btn)" }}>
          <Upload className="w-4 h-4" />
          Новий імпорт
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Shared UI components                                               */
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

function SelectCard({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border-sub)" }}>
      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--a-text-5)" }}>{label}</p>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm appearance-none bg-transparent pr-6"
          style={{ color: "var(--a-text-2)" }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--a-text-4)" }} />
      </div>
    </div>
  );
}
