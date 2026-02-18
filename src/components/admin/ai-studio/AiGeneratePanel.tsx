"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, FileEdit, Search, Loader2, Check, X, RotateCw } from "lucide-react";

interface AiGeneratePanelProps {
  productName: string;
  brand?: string;
  brandId?: string;
  category?: string;
  price?: number;
  sku?: string;
  currentDescription: string | null;
  otherLangDescription: string | null;
  targetLang: "uk" | "ru";
  label: string;
  onAccept: (html: string) => void;
}

type Action = "generate" | "translate" | "improve" | "seo";

export function AiGeneratePanel({
  productName,
  brand,
  brandId,
  category,
  price,
  sku,
  currentDescription,
  otherLangDescription,
  targetLang,
  label,
  onAccept,
}: AiGeneratePanelProps) {
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [error, setError] = useState("");

  const otherLabel = targetLang === "uk" ? "RU" : "UK";
  const hasOther = !!otherLangDescription?.trim();
  const hasCurrent = !!currentDescription?.trim();

  const callAI = async (action: Action) => {
    setLoading(true);
    setActiveAction(action);
    setPreviewHtml("");
    setError("");

    try {
      const res = await fetch("/api/admin/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          targetLang,
          productName,
          brand,
          brandId,
          category,
          price,
          sku,
          existingDescription: action === "translate" ? otherLangDescription : currentDescription,
          otherLangDescription: action === "generate" ? otherLangDescription : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Помилка генерації");
      } else {
        setPreviewHtml(data.html || "");
      }
    } catch {
      setError("Мережева помилка");
    }
    setLoading(false);
  };

  const handleAccept = () => {
    onAccept(previewHtml);
    setPreviewHtml("");
    setActiveAction(null);
  };

  const handleCancel = () => {
    setPreviewHtml("");
    setActiveAction(null);
    setError("");
  };

  const btn = "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium disabled:opacity-30 disabled:cursor-not-allowed";
  const btnS = { background: "#1a0f2e", color: "#a78bfa", border: "1px solid #7c3aed40" };

  return (
    <div>
      <p className="text-[11px] font-medium mb-2" style={{ color: "var(--a-text-3)" }}>{label}</p>

      {/* Current description preview */}
      {hasCurrent ? (
        <div className="rounded-lg p-2.5 mb-2 max-h-[120px] overflow-y-auto text-xs leading-relaxed" style={{ background: "var(--a-bg-input)", color: "var(--a-text-body)" }}>
          <div dangerouslySetInnerHTML={{ __html: currentDescription! }} />
        </div>
      ) : (
        <div className="rounded-lg p-3 mb-2 text-center" style={{ background: "var(--a-bg-input)" }}>
          <span className="text-xs" style={{ color: "#ef4444" }}>Опису немає</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1 flex-wrap mb-2">
        <button onClick={() => callAI("generate")} disabled={loading} className={btn} style={btnS}>
          {loading && activeAction === "generate" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Згенерувати
        </button>
        <button onClick={() => callAI("translate")} disabled={loading || !hasOther} className={btn} style={btnS}>
          {loading && activeAction === "translate" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          З {otherLabel}
        </button>
        <button onClick={() => callAI("improve")} disabled={loading || !hasCurrent} className={btn} style={btnS}>
          {loading && activeAction === "improve" ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileEdit className="w-3 h-3" />}
          Покращити
        </button>
        <button onClick={() => callAI("seo")} disabled={loading} className={btn} style={btnS}>
          {loading && activeAction === "seo" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
          SEO
        </button>
      </div>

      {error && <p className="text-[11px] mb-2" style={{ color: "#f87171" }}>{error}</p>}

      {/* AI Preview */}
      {(previewHtml || (loading && activeAction)) && (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #7c3aed40", background: "#0f0a1a" }}>
          <div className="px-2.5 py-1.5" style={{ borderBottom: "1px solid #7c3aed30", background: "#1a0f2e" }}>
            <span className="text-[10px] font-medium" style={{ color: "#a78bfa" }}>AI пропозиція</span>
          </div>
          <div className="p-2.5 max-h-[200px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 py-3 justify-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#a78bfa" }} />
                <span className="text-xs" style={{ color: "var(--a-text-4)" }}>Генерація...</span>
              </div>
            ) : (
              <div className="text-xs leading-relaxed" style={{ color: "var(--a-text-body)" }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
            )}
          </div>
          {!loading && previewHtml && (
            <div className="px-2.5 py-1.5 flex items-center gap-1.5" style={{ borderTop: "1px solid #7c3aed30", background: "#1a0f2e" }}>
              <button onClick={handleAccept} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium" style={{ background: "#166534", color: "#4ade80" }}>
                <Check className="w-3 h-3" /> Ок
              </button>
              <button onClick={() => activeAction && callAI(activeAction)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium" style={{ background: "var(--a-bg-input)", color: "var(--a-text-3)" }}>
                <RotateCw className="w-3 h-3" /> Ще
              </button>
              <button onClick={handleCancel} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium" style={{ color: "var(--a-text-5)" }}>
                <X className="w-3 h-3" /> Ні
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
