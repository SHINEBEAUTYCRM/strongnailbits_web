"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowRightLeft,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  X,
  Check,
} from "lucide-react";

interface Redirect {
  id: string;
  from_path: string;
  to_path: string;
  code: number;
  hits: number;
  is_active: boolean;
  note: string | null;
  created_at: string;
  last_hit_at: string | null;
}

export default function RedirectsPage() {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({ from_path: "", to_path: "", code: 301, note: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const fetchRedirects = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (search.trim()) sp.set("search", search.trim());
      if (onlyActive) sp.set("active", "true");
      const res = await fetch(`/api/admin/redirects?${sp}`);
      const json = await res.json();
      setRedirects(json.redirects ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [search, onlyActive]);

  useEffect(() => { fetchRedirects(); }, [fetchRedirects]);

  const activeCount = redirects.filter((r) => r.is_active).length;
  const totalHits = redirects.reduce((sum, r) => sum + (r.hits || 0), 0);

  function openCreate() {
    setForm({ from_path: "", to_path: "", code: 301, note: "" });
    setEditId(null);
    setFormError("");
    setShowCreate(true);
  }

  function openEdit(r: Redirect) {
    setForm({ from_path: r.from_path, to_path: r.to_path, code: r.code, note: r.note || "" });
    setEditId(r.id);
    setFormError("");
    setShowCreate(true);
  }

  async function handleSave() {
    if (!form.from_path.startsWith("/")) { setFormError("from_path має починатись з /"); return; }
    if (!form.to_path.trim()) { setFormError("to_path обов'язковий"); return; }
    setSaving(true);
    setFormError("");
    try {
      const url = editId ? `/api/admin/redirects/${editId}` : "/api/admin/redirects";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error || "Error"); return; }
      setShowCreate(false);
      fetchRedirects();
    } catch { setFormError("Connection error"); } finally { setSaving(false); }
  }

  async function handleDelete(id: string, from: string) {
    if (!confirm(`Видалити redirect "${from}"?`)) return;
    await fetch(`/api/admin/redirects/${id}`, { method: "DELETE" });
    setRedirects((prev) => prev.filter((r) => r.id !== id));
  }

  async function toggleActive(r: Redirect) {
    await fetch(`/api/admin/redirects/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !r.is_active }),
    });
    setRedirects((prev) => prev.map((x) => x.id === r.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function handleImport() {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/redirects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      const json = await res.json();
      setImportResult(json);
      if (json.imported > 0) fetchRedirects();
    } catch { /* ignore */ } finally { setImporting(false); }
  }

  const inputStyle = { borderColor: "var(--a-border)", background: "var(--a-card)", color: "var(--a-text)" };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowRightLeft size={22} style={{ color: "var(--a-accent)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--a-text)" }}>Редиректи</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setCsvText(""); setImportResult(null); setShowImport(true); }}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
            style={{ borderColor: "var(--a-border)", color: "var(--a-text-secondary)" }}>
            <Upload size={14} /> Імпорт CSV
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: "var(--a-accent)" }}>
            <Plus size={16} /> Новий
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 flex gap-4 text-xs" style={{ color: "var(--a-text-secondary)" }}>
        <span>Всього: <strong>{redirects.length}</strong></span>
        <span>Активних: <strong>{activeCount}</strong></span>
        <span>Хітів: <strong>{totalHits.toLocaleString()}</strong></span>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1" style={{ maxWidth: 360 }}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--a-text-secondary)" }} />
          <input type="text" placeholder="Пошук за path..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border pl-9 pr-3 text-sm outline-none" style={inputStyle} />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: "var(--a-text-secondary)" }}>
          <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
          Тільки активні
        </label>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--a-border)", background: "var(--a-card)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--a-accent)" }} />
          </div>
        ) : redirects.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: "var(--a-text-secondary)" }}>Редиректів не знайдено</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                  {["From", "To", "Код", "Хіти", "Актив.", "Примітка", "Дії"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {redirects.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--a-border)" }}>
                    <td className="px-3 py-2.5">
                      <code className="rounded px-1.5 py-0.5 text-xs" style={{ background: "var(--a-bg)", color: "var(--a-text)" }}>{r.from_path}</code>
                    </td>
                    <td className="px-3 py-2.5">
                      <code className="rounded px-1.5 py-0.5 text-xs" style={{ background: "var(--a-bg)", color: "var(--a-text)" }}>{r.to_path}</code>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold"
                        style={{ color: r.code === 301 ? "#22c55e" : "#eab308", background: r.code === 301 ? "rgba(34,197,94,0.12)" : "rgba(234,179,8,0.12)" }}>
                        {r.code}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "var(--a-text-secondary)" }}>{r.hits}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => toggleActive(r)} className="text-sm">
                        {r.is_active ? <Check size={16} style={{ color: "#22c55e" }} /> : <X size={16} style={{ color: "#9ca3af" }} />}
                      </button>
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2.5 text-xs" style={{ color: "var(--a-text-secondary)" }}>{r.note || "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(r)} className="rounded-md p-1.5" style={{ color: "var(--a-text-secondary)" }}><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(r.id, r.from_path)} className="rounded-md p-1.5" style={{ color: "#ef4444" }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-xl border p-6" style={{ background: "var(--a-card)", borderColor: "var(--a-border)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold" style={{ color: "var(--a-text)" }}>{editId ? "Редагувати" : "Новий редирект"}</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>From path *</label>
                <input value={form.from_path} onChange={(e) => setForm({ ...form, from_path: e.target.value })}
                  className="h-9 w-full rounded-lg border px-3 font-mono text-sm outline-none" style={inputStyle} placeholder="/старий-шлях" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>To path *</label>
                <input value={form.to_path} onChange={(e) => setForm({ ...form, to_path: e.target.value })}
                  className="h-9 w-full rounded-lg border px-3 font-mono text-sm outline-none" style={inputStyle} placeholder="/новий-шлях" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>Код</label>
                <select value={form.code} onChange={(e) => setForm({ ...form, code: Number(e.target.value) })}
                  className="h-9 w-full rounded-lg border px-3 text-sm outline-none" style={inputStyle}>
                  <option value={301}>301 (Permanent)</option>
                  <option value={302}>302 (Temporary)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>Примітка</label>
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>
              {formError && <div className="text-xs text-red-500">{formError}</div>}
              <div className="flex gap-2 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: "var(--a-accent)" }}>
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editId ? "Зберегти" : "Створити"}
                </button>
                <button onClick={() => setShowCreate(false)} className="rounded-lg border px-4 py-2 text-sm"
                  style={{ borderColor: "var(--a-border)", color: "var(--a-text-secondary)" }}>Скасувати</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowImport(false)}>
          <div className="w-full max-w-lg rounded-xl border p-6" style={{ background: "var(--a-card)", borderColor: "var(--a-border)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold" style={{ color: "var(--a-text)" }}>Імпорт CSV</h2>
            <p className="mb-2 text-xs" style={{ color: "var(--a-text-secondary)" }}>
              Формат: <code>from_path,to_path</code> (одна пара на рядок)
            </p>
            <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={8} placeholder={"/old-gel-laki,/catalog/gel-laki\n/staryj-tovar.html,/product/novyj-tovar"}
              className="mb-3 w-full rounded-lg border px-3 py-2 font-mono text-xs outline-none" style={inputStyle} />
            {importResult && (
              <div className="mb-3 rounded-lg border p-3 text-xs" style={{ borderColor: "var(--a-border)" }}>
                <div style={{ color: "#22c55e" }}>Імпортовано: {importResult.imported}</div>
                {importResult.skipped > 0 && <div style={{ color: "#eab308" }}>Пропущено: {importResult.skipped}</div>}
                {importResult.errors.length > 0 && (
                  <div className="mt-1 max-h-24 overflow-y-auto" style={{ color: "#ef4444" }}>
                    {importResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleImport} disabled={importing || !csvText.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--a-accent)" }}>
                {importing && <Loader2 size={14} className="animate-spin" />}
                Імпортувати
              </button>
              <button onClick={() => setShowImport(false)} className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--a-border)", color: "var(--a-text-secondary)" }}>Закрити</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
