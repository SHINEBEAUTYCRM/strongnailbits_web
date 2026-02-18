"use client";

import { useState, useEffect, useCallback } from "react";
import { Radio, ChevronDown, ChevronUp, Plus, X, Save, AlertTriangle, Check } from "lucide-react";

interface BrandSourcesPanelProps {
  brandId: string;
  brandName: string;
}

interface BrandSources {
  source_urls: string[];
  source_notes: string;
  ai_prompt_context: string;
}

export function BrandSourcesPanel({ brandId, brandName }: BrandSourcesPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [urls, setUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [promptContext, setPromptContext] = useState("");

  const fetchSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/brands?id=${brandId}`);
      if (!res.ok) throw new Error("Помилка завантаження");
      const data: BrandSources = await res.json();
      setUrls(Array.isArray(data.source_urls) ? data.source_urls : []);
      setNotes(data.source_notes || "");
      setPromptContext(data.ai_prompt_context || "");
    } catch {
      setError("Не вдалося завантажити джерела бренду");
    }
    setLoading(false);
  }, [brandId]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const cleanUrls = urls.map(u => u.trim()).filter(Boolean);
      const res = await fetch("/api/admin/brands", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: brandId,
          source_urls: cleanUrls,
          source_notes: notes,
          ai_prompt_context: promptContext,
        }),
      });
      if (!res.ok) throw new Error("Помилка збереження");
      setUrls(cleanUrls);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Не вдалося зберегти");
    }
    setSaving(false);
  };

  const addUrl = () => setUrls(prev => [...prev, ""]);
  const removeUrl = (i: number) => setUrls(prev => prev.filter((_, idx) => idx !== i));
  const updateUrl = (i: number, val: string) => setUrls(prev => prev.map((u, idx) => idx === i ? val : u));

  const hasEmptySources = urls.filter(u => u.trim()).length === 0;

  return (
    <div className="rounded-xl mb-4 overflow-hidden" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)" }}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        style={{ borderBottom: collapsed ? "none" : "1px solid var(--a-border)" }}
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4" style={{ color: "#a78bfa" }} />
          <span className="text-sm font-medium" style={{ color: "var(--a-text)" }}>
            Джерела бренду <span style={{ color: "#a78bfa" }}>{brandName}</span>
          </span>
          {hasEmptySources && !loading && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "#f59e0b20", color: "#f59e0b" }}>
              <AlertTriangle className="w-3 h-3" /> немає URL
            </span>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={saved
              ? { background: "#22c55e20", color: "#22c55e" }
              : { background: "#7c3aed20", color: "#a78bfa" }
            }
          >
            {saved ? (
              <><Check className="w-3.5 h-3.5" /> Збережено</>
            ) : saving ? (
              <><Save className="w-3.5 h-3.5 animate-pulse" /> Зберігаю...</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> Зберегти</>
            )}
          </button>
          <button className="p-1" style={{ color: "var(--a-text-4)" }} onClick={() => setCollapsed(v => !v)}>
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 py-4 space-y-4">
          {loading ? (
            <div className="py-4 text-center text-sm" style={{ color: "var(--a-text-4)" }}>Завантаження...</div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: "#ef444420", color: "#ef4444" }}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {hasEmptySources && (
                <div className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg" style={{ background: "#f59e0b15", color: "#f59e0b", border: "1px solid #f59e0b30" }}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Додайте URL сайтів, щоб AI брав реальну інформацію замість вигадок</span>
                </div>
              )}

              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--a-text-3)" }}>URL-и:</p>
                <div className="space-y-2">
                  {urls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={e => updateUrl(i, e.target.value)}
                        placeholder="https://..."
                        className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                        style={{
                          background: "var(--a-bg-input)",
                          border: "1px solid var(--a-border)",
                          color: "var(--a-text)",
                        }}
                      />
                      <button
                        onClick={() => removeUrl(i)}
                        className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                        style={{ color: "var(--a-text-4)", background: "var(--a-bg-input)" }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addUrl}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                    style={{ color: "#a78bfa", background: "#7c3aed15" }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Додати URL
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>Нотатки для AI:</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Наприклад: Український преміум бренд косметики..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{
                    background: "var(--a-bg-input)",
                    border: "1px solid var(--a-border)",
                    color: "var(--a-text)",
                  }}
                />
              </div>

              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>Промпт-контекст:</p>
                <textarea
                  value={promptContext}
                  onChange={e => setPromptContext(e.target.value)}
                  placeholder="Наприклад: Не вигадуй об'єм та склад — бери тільки з джерел..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{
                    background: "var(--a-bg-input)",
                    border: "1px solid var(--a-border)",
                    color: "var(--a-text)",
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
