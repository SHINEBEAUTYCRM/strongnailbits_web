"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, FileEdit, Search, Loader2 } from "lucide-react";
import { AiPreview } from "./AiPreview";

interface AiDescriptionButtonsProps {
  productName: string;
  brand?: string;
  category?: string;
  price?: number;
  currentDescription: string;
  otherLangDescription: string;
  targetLang: "uk" | "ru";
  otherLang: "uk" | "ru";
  onAccept: (html: string) => void;
}

type AiAction = "generate" | "translate" | "improve" | "seo";

export function AiDescriptionButtons({
  productName,
  brand,
  category,
  price,
  currentDescription,
  otherLangDescription,
  targetLang,
  otherLang,
  onAccept,
}: AiDescriptionButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<AiAction | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [error, setError] = useState("");

  const otherLangLabel = otherLang === "uk" ? "UK" : "RU";

  const callAI = async (action: AiAction) => {
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
          category,
          price,
          existingDescription: action === "translate" ? otherLangDescription : currentDescription,
          otherLangDescription: action === "generate" ? otherLangDescription : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Помилка генерації");
        setLoading(false);
        return;
      }

      setPreviewHtml(data.html || "");
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

  const handleRegenerate = () => {
    if (activeAction) callAI(activeAction);
  };

  const handleCancel = () => {
    setPreviewHtml("");
    setActiveAction(null);
    setError("");
  };

  const btnBase =
    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const btnStyle = {
    background: "#1a0f2e",
    color: "#a78bfa",
    border: "1px solid #7c3aed40",
  };

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-medium mr-1" style={{ color: "#a78bfa" }}>
          AI:
        </span>

        <button
          onClick={() => callAI("generate")}
          disabled={loading}
          className={btnBase}
          style={btnStyle}
        >
          {loading && activeAction === "generate" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          Згенерувати
        </button>

        <button
          onClick={() => callAI("translate")}
          disabled={loading || !otherLangDescription}
          className={btnBase}
          style={btnStyle}
          title={!otherLangDescription ? `Немає опису ${otherLangLabel} для перекладу` : undefined}
        >
          {loading && activeAction === "translate" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Переклад з {otherLangLabel}
        </button>

        <button
          onClick={() => callAI("improve")}
          disabled={loading || !currentDescription}
          className={btnBase}
          style={btnStyle}
          title={!currentDescription ? "Немає опису для покращення" : undefined}
        >
          {loading && activeAction === "improve" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <FileEdit className="w-3 h-3" />
          )}
          Покращити
        </button>

        <button
          onClick={() => callAI("seo")}
          disabled={loading}
          className={btnBase}
          style={btnStyle}
        >
          {loading && activeAction === "seo" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Search className="w-3 h-3" />
          )}
          SEO
        </button>
      </div>

      {error && (
        <p className="text-xs mt-2" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}

      {(previewHtml || (loading && activeAction)) && (
        <AiPreview
          html={previewHtml}
          loading={loading}
          onAccept={handleAccept}
          onRegenerate={handleRegenerate}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
