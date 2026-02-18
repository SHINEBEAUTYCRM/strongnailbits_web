"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface AiSeoButtonsProps {
  productName: string;
  brand?: string;
  category?: string;
  description?: string;
  targetLang: "uk" | "ru";
  onAccept: (meta: { meta_title: string; meta_description: string }) => void;
}

export function AiSeoButtons({
  productName,
  brand,
  category,
  description,
  targetLang,
  onAccept,
}: AiSeoButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/ai/generate-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, brand, category, description, targetLang }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Помилка генерації SEO");
        setLoading(false);
        return;
      }

      onAccept({
        meta_title: data.meta_title || "",
        meta_description: data.meta_description || "",
      });
    } catch {
      setError("Мережева помилка");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={generate}
        disabled={loading || !productName}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "#1a0f2e", color: "#a78bfa", border: "1px solid #7c3aed40" }}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Sparkles className="w-3 h-3" />
        )}
        AI SEO
      </button>
      {error && (
        <span className="text-[11px]" style={{ color: "#f87171" }}>
          {error}
        </span>
      )}
    </div>
  );
}
