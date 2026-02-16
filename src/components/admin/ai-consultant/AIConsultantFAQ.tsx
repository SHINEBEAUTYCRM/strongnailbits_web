"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  HelpCircle,
  Save,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FAQCategory {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sort_order: number;
}

interface FAQEntry {
  id: string;
  category_id: string | null;
  question: string;
  answer: string;
  keywords: string[];
  is_active: boolean;
  sort_order: number;
  times_used: number;
  created_at: string;
  updated_at: string;
  ai_faq_categories: { slug: string; name: string; icon: string | null } | null;
}

interface EntryForm {
  category_id: string;
  question: string;
  answer: string;
  keywordsInput: string;
  keywords: string[];
}

const EMPTY_FORM: EntryForm = {
  category_id: "",
  question: "",
  answer: "",
  keywordsInput: "",
  keywords: [],
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const cardStyle: React.CSSProperties = {
  background: "var(--a-bg-card)",
  border: "1px solid var(--a-border)",
  borderRadius: 12,
  padding: 16,
};

const inputStyle: React.CSSProperties = {
  background: "var(--a-bg-input)",
  border: "1px solid var(--a-border)",
  borderRadius: 12,
  padding: "10px 14px",
  color: "var(--a-text)",
  fontSize: 13,
  width: "100%",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  color: "var(--a-text-3)",
  fontSize: 12,
  fontWeight: 500,
  marginBottom: 4,
  display: "block",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AIConsultantFAQ() {
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [entries, setEntries] = useState<FAQEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM);

  /* ── Data loading ────────────────────────────────── */

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-consultant/faq/categories");
      const json = await res.json();
      if (json.success) setCategories(json.data);
    } catch (err) {
      console.error("[FAQ] Load categories failed:", err);
    }
  }, []);

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-consultant/faq");
      const json = await res.json();
      if (json.success) setEntries(json.data);
    } catch (err) {
      console.error("[FAQ] Load entries failed:", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadCategories(), loadEntries()]).finally(() => setLoading(false));
  }, [loadCategories, loadEntries]);

  /* ── Filtered entries ────────────────────────────── */

  const filtered = activeCategory
    ? entries.filter((e) => e.ai_faq_categories?.slug === activeCategory)
    : entries;

  const countBySlug = (slug: string) =>
    entries.filter((e) => e.ai_faq_categories?.slug === slug).length;

  /* ── CRUD ─────────────────────────────────────────── */

  const handleCreate = async () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ai-consultant/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: form.category_id || null,
          question: form.question.trim(),
          answer: form.answer.trim(),
          keywords: form.keywords,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setForm(EMPTY_FORM);
        await loadEntries();
      }
    } catch (err) {
      console.error("[FAQ] Create failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/ai-consultant/faq/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: form.category_id || null,
          question: form.question.trim(),
          answer: form.answer.trim(),
          keywords: form.keywords,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingEntry(null);
        setForm(EMPTY_FORM);
        await loadEntries();
      }
    } catch (err) {
      console.error("[FAQ] Update failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (entry: FAQEntry) => {
    try {
      await fetch(`/api/admin/ai-consultant/faq/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !entry.is_active }),
      });
      await loadEntries();
    } catch (err) {
      console.error("[FAQ] Toggle failed:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Видалити це питання?")) return;
    try {
      await fetch(`/api/admin/ai-consultant/faq/${id}`, { method: "DELETE" });
      await loadEntries();
    } catch (err) {
      console.error("[FAQ] Delete failed:", err);
    }
  };

  const startEdit = (entry: FAQEntry) => {
    setEditingEntry(entry.id);
    setForm({
      category_id: entry.category_id || "",
      question: entry.question,
      answer: entry.answer,
      keywordsInput: entry.keywords.join(", "),
      keywords: entry.keywords,
    });
  };

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setShowAddModal(true);
  };

  const parseKeywords = (input: string): string[] =>
    input
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

  /* ── Loading ─────────────────────────────────────── */

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, color: "var(--a-text-4)" }}>
        <Loader2 className="w-6 h-6 animate-spin" />
        <span style={{ marginLeft: 10 }}>Завантаження…</span>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────── */

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, var(--a-accent), #ec4899)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <BookOpen className="w-6 h-6" style={{ color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--a-text)", margin: 0 }}>
              FAQ база знань
            </h1>
            <p style={{ fontSize: 13, color: "var(--a-text-4)", margin: "2px 0 0" }}>
              {entries.length} {entries.length === 1 ? "запис" : entries.length < 5 ? "записи" : "записів"}
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 text-white text-sm font-semibold transition-opacity"
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg, var(--a-accent), #ec4899)",
            cursor: "pointer",
          }}
        >
          <Plus className="w-4 h-4" />
          Додати питання
        </button>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          <button
            onClick={() => setActiveCategory(null)}
            className="text-xs font-medium transition-colors"
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: `1px solid ${!activeCategory ? "var(--a-accent)" : "var(--a-border)"}`,
              background: !activeCategory ? "var(--a-accent-bg)" : "transparent",
              color: !activeCategory ? "var(--a-accent)" : "var(--a-text-3)",
              cursor: "pointer",
            }}
          >
            Всі ({entries.length})
          </button>
          {categories.map((cat) => {
            const active = activeCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.slug)}
                className="text-xs font-medium transition-colors"
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: `1px solid ${active ? "var(--a-accent)" : "var(--a-border)"}`,
                  background: active ? "var(--a-accent-bg)" : "transparent",
                  color: active ? "var(--a-accent)" : "var(--a-text-3)",
                  cursor: "pointer",
                }}
              >
                {cat.icon ? `${cat.icon} ` : ""}{cat.name} ({countBySlug(cat.slug)})
              </button>
            );
          })}
        </div>
      )}

      {/* Entries list */}
      {filtered.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 60 }}>
          <HelpCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--a-text-5)" }} />
          <p style={{ color: "var(--a-text-4)", fontSize: 14 }}>Додайте перше питання</p>
          <button
            onClick={openAddModal}
            className="text-xs font-medium mt-3 inline-flex items-center gap-1"
            style={{ color: "var(--a-accent)", background: "none", border: "none", cursor: "pointer" }}
          >
            <Plus className="w-3.5 h-3.5" /> Створити запис
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((entry) => (
            <div key={entry.id} style={{ ...cardStyle, opacity: entry.is_active ? 1 : 0.55 }}>
              {editingEntry === entry.id ? (
                /* Inline edit form */
                <InlineForm
                  form={form}
                  categories={categories}
                  saving={saving}
                  onFormChange={setForm}
                  parseKeywords={parseKeywords}
                  onSave={() => handleUpdate(entry.id)}
                  onCancel={() => { setEditingEntry(null); setForm(EMPTY_FORM); }}
                />
              ) : (
                <>
                  {/* Question */}
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: "var(--a-accent)", fontSize: 12, fontWeight: 600, marginRight: 4 }}>Q:</span>
                    <span style={{ color: "var(--a-text)", fontSize: 14, fontWeight: 600 }}>{entry.question}</span>
                  </div>

                  {/* Answer */}
                  <div style={{ color: "var(--a-text-2)", fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
                    <span style={{ color: "var(--a-text-4)", fontSize: 12, fontWeight: 600, marginRight: 4 }}>A:</span>
                    {entry.answer}
                  </div>

                  {/* Keywords */}
                  {entry.keywords.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                      {entry.keywords.map((kw) => (
                        <span
                          key={kw}
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "var(--a-accent-bg)",
                            color: "var(--a-accent)",
                          }}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer: stats + actions */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 11, color: "var(--a-text-5)" }}>
                        Використано: {entry.times_used ?? 0} разів
                      </span>
                      {entry.ai_faq_categories && (
                        <span
                          style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 6,
                            background: "var(--a-bg-hover)", color: "var(--a-text-4)",
                          }}
                        >
                          {entry.ai_faq_categories.icon ? `${entry.ai_faq_categories.icon} ` : ""}{entry.ai_faq_categories.name}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {/* Toggle active */}
                      <button
                        onClick={() => handleToggleActive(entry)}
                        style={{
                          width: 34, height: 18, borderRadius: 9,
                          border: "none", cursor: "pointer", position: "relative",
                          background: entry.is_active ? "var(--a-accent)" : "var(--a-bg-hover)",
                          transition: "background 0.2s",
                        }}
                      >
                        <div
                          style={{
                            width: 14, height: 14, borderRadius: "50%",
                            background: "#fff", position: "absolute", top: 2,
                            left: entry.is_active ? 18 : 2,
                            transition: "left 0.2s",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                          }}
                        />
                      </button>

                      <button
                        onClick={() => startEdit(entry)}
                        className="flex items-center gap-1 text-[11px] font-medium transition-colors"
                        style={{ color: "var(--a-text-3)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--a-accent)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--a-text-3)"; }}
                      >
                        <Pencil className="w-3 h-3" /> Редагувати
                      </button>

                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="flex items-center gap-1 text-[11px] font-medium transition-colors"
                        style={{ color: "var(--a-text-4)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--a-text-4)"; }}
                      >
                        <Trash2 className="w-3 h-3" /> Видалити
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-start justify-center"
          style={{ backdropFilter: "blur(4px)", background: "rgba(0,0,0,0.5)", paddingTop: 80 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div
            className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--a-border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--a-text)" }}>Нове питання</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex items-center justify-center w-7 h-7 rounded-lg"
                style={{ color: "var(--a-text-3)", background: "none", border: "none", cursor: "pointer" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-5 py-4 flex flex-col gap-3.5">
              {/* Category */}
              <div>
                <label style={labelStyle}>Категорія</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Без категорії</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Question */}
              <div>
                <label style={labelStyle}>Питання *</label>
                <input
                  type="text"
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  placeholder="Як оформити замовлення?"
                  style={inputStyle}
                />
              </div>

              {/* Answer */}
              <div>
                <label style={labelStyle}>Відповідь *</label>
                <textarea
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  rows={4}
                  placeholder="Детальна відповідь..."
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                />
              </div>

              {/* Keywords */}
              <div>
                <label style={labelStyle}>Ключові слова (через кому)</label>
                <input
                  type="text"
                  value={form.keywordsInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm({ ...form, keywordsInput: v, keywords: parseKeywords(v) });
                  }}
                  placeholder="замовлення, оплата, доставка"
                  style={inputStyle}
                />
                {form.keywords.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {form.keywords.map((kw) => (
                      <span key={kw} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "var(--a-accent-bg)", color: "var(--a-accent)" }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5" style={{ borderTop: "1px solid var(--a-border)" }}>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium"
                style={{ background: "var(--a-bg-hover)", color: "var(--a-text-3)", border: "none", cursor: "pointer" }}
              >
                Скасувати
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.question.trim() || !form.answer.trim() || saving}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, var(--a-accent), #ec4899)",
                  border: "none", cursor: !form.question.trim() || !form.answer.trim() || saving ? "default" : "pointer",
                  opacity: !form.question.trim() || !form.answer.trim() || saving ? 0.5 : 1,
                }}
              >
                {saving ? "Зберігаю…" : "Зберегти"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline edit form                                                   */
/* ------------------------------------------------------------------ */

function InlineForm({
  form,
  categories,
  saving,
  onFormChange,
  parseKeywords,
  onSave,
  onCancel,
}: {
  form: EntryForm;
  categories: FAQCategory[];
  saving: boolean;
  onFormChange: (f: EntryForm) => void;
  parseKeywords: (input: string) => string[];
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <label style={labelStyle}>Категорія</label>
        <select
          value={form.category_id}
          onChange={(e) => onFormChange({ ...form, category_id: e.target.value })}
          style={inputStyle}
        >
          <option value="">Без категорії</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Питання</label>
        <input
          type="text"
          value={form.question}
          onChange={(e) => onFormChange({ ...form, question: e.target.value })}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Відповідь</label>
        <textarea
          value={form.answer}
          onChange={(e) => onFormChange({ ...form, answer: e.target.value })}
          rows={4}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
        />
      </div>

      <div>
        <label style={labelStyle}>Ключові слова</label>
        <input
          type="text"
          value={form.keywordsInput}
          onChange={(e) => {
            const v = e.target.value;
            onFormChange({ ...form, keywordsInput: v, keywords: parseKeywords(v) });
          }}
          style={inputStyle}
        />
        {form.keywords.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
            {form.keywords.map((kw) => (
              <span key={kw} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "var(--a-accent-bg)", color: "var(--a-accent)" }}>
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-xs font-medium"
          style={{ background: "var(--a-bg-hover)", color: "var(--a-text-3)", border: "none", cursor: "pointer" }}
        >
          Скасувати
        </button>
        <button
          onClick={onSave}
          disabled={!form.question.trim() || !form.answer.trim() || saving}
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, var(--a-accent), #ec4899)",
            border: "none",
            cursor: !form.question.trim() || !form.answer.trim() || saving ? "default" : "pointer",
            opacity: !form.question.trim() || !form.answer.trim() || saving ? 0.5 : 1,
          }}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          {saving ? "Зберігаю…" : "Зберегти"}
        </button>
      </div>
    </div>
  );
}
