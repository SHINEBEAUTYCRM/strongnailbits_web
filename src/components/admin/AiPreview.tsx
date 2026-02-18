"use client";

import { RefreshCw, Check, X } from "lucide-react";

interface AiPreviewProps {
  html: string;
  loading: boolean;
  onAccept: () => void;
  onRegenerate: () => void;
  onCancel: () => void;
}

export function AiPreview({ html, loading, onAccept, onRegenerate, onCancel }: AiPreviewProps) {
  return (
    <div className="mt-3 rounded-lg overflow-hidden" style={{ border: "1px solid #7c3aed40", background: "#0f0a1a" }}>
      <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid #7c3aed30", background: "#1a0f2e" }}>
        <span className="text-xs font-medium" style={{ color: "#a78bfa" }}>AI пропозиція</span>
      </div>

      <div className="p-3 max-h-[300px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-2 py-4 justify-center">
            <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#a78bfa" }} />
            <span className="text-sm" style={{ color: "var(--a-text-4)" }}>Генерація...</span>
          </div>
        ) : (
          <div
            className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed"
            style={{ color: "var(--a-text-body)" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      {!loading && html && (
        <div className="px-3 py-2 flex items-center gap-2" style={{ borderTop: "1px solid #7c3aed30", background: "#1a0f2e" }}>
          <button
            onClick={onAccept}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium"
            style={{ background: "#166534", color: "#4ade80", border: "1px solid #16653480" }}
          >
            <Check className="w-3.5 h-3.5" /> Прийняти
          </button>
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium"
            style={{ background: "var(--a-bg-input)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Перегенерувати
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium"
            style={{ color: "var(--a-text-4)" }}
          >
            <X className="w-3.5 h-3.5" /> Скасувати
          </button>
        </div>
      )}
    </div>
  );
}
