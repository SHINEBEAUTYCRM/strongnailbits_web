"use client";

import { useState, useEffect, useCallback } from "react";
import { History, Loader2, ChevronDown, ChevronRight } from "lucide-react";

interface AuditEntry {
  id: string;
  actor_id: string;
  actor_name: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ENTITY_COLORS: Record<string, { color: string; bg: string }> = {
  product: { color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  category: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  feature: { color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  menu: { color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  page: { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  order: { color: "#eab308", bg: "rgba(234,179,8,0.12)" },
  redirect: { color: "#9ca3af", bg: "rgba(156,163,175,0.12)" },
  filter: { color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
};

const ACTION_COLORS: Record<string, { color: string; bg: string }> = {
  create: { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  update: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  delete: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  import: { color: "#f97316", bg: "rgba(249,115,22,0.12)" },
};

const ENTITIES = ["", "product", "category", "feature", "menu", "page", "order", "redirect", "filter"];
const ACTIONS = ["", "create", "update", "delete", "import"];

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const limit = 50;

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      if (entity) sp.set("entity", entity);
      if (action) sp.set("action", action);
      if (dateFrom) sp.set("from", dateFrom);
      if (dateTo) sp.set("to", dateTo);
      const res = await fetch(`/api/admin/audit?${sp}`);
      const json = await res.json();
      setEntries(json.entries ?? []);
      setTotal(json.total ?? 0);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, entity, action, dateFrom, dateTo]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const totalPages = Math.ceil(total / limit);

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000) return "щойно";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} хв тому`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} год тому`;
    return d.toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function renderJson(data: Record<string, unknown> | null, color: string) {
    if (!data) return <span className="text-xs italic" style={{ color: "var(--a-text-secondary)" }}>—</span>;
    return (
      <pre
        className="max-h-60 overflow-auto rounded-lg p-3 text-xs leading-relaxed"
        style={{ background: color, color: "var(--a-text)", fontFamily: "monospace" }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  const inputStyle = { borderColor: "var(--a-border)", background: "var(--a-card)", color: "var(--a-text)" };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <History size={22} style={{ color: "var(--a-accent)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--a-text)" }}>Журнал дій</h1>
        <span className="ml-2 text-xs" style={{ color: "var(--a-text-secondary)" }}>{total} записів</span>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border px-3 text-xs outline-none" style={inputStyle}>
          <option value="">Всі сутності</option>
          {ENTITIES.filter(Boolean).map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border px-3 text-xs outline-none" style={inputStyle}>
          <option value="">Всі дії</option>
          {ACTIONS.filter(Boolean).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border px-3 text-xs outline-none" style={inputStyle} />
        <span className="text-xs" style={{ color: "var(--a-text-secondary)" }}>—</span>
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border px-3 text-xs outline-none" style={inputStyle} />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--a-border)", background: "var(--a-card)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--a-accent)" }} />
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: "var(--a-text-secondary)" }}>Записів не знайдено</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                {["", "Час", "Хто", "Що", "Дія", "ID"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const ec = ENTITY_COLORS[entry.entity] ?? { color: "#9ca3af", bg: "rgba(156,163,175,0.12)" };
                const ac = ACTION_COLORS[entry.action] ?? { color: "#9ca3af", bg: "rgba(156,163,175,0.12)" };
                const isExpanded = expandedId === entry.id;
                return (
                  <tr key={entry.id} style={{ borderBottom: "1px solid var(--a-border)" }}>
                    <td className="w-8 px-3 py-2.5">
                      <button onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                        {isExpanded ? <ChevronDown size={14} style={{ color: "var(--a-text-secondary)" }} /> : <ChevronRight size={14} style={{ color: "var(--a-text-secondary)" }} />}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs" style={{ color: "var(--a-text-secondary)" }}>{formatTime(entry.created_at)}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "var(--a-text)" }}>{entry.actor_name || "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ color: ec.color, background: ec.bg }}>{entry.entity}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ color: ac.color, background: ac.bg }}>{entry.action}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {entry.entity_id ? (
                        <code className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "var(--a-bg)", color: "var(--a-text-secondary)" }}>
                          {entry.entity_id.slice(0, 8)}…
                        </code>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Expanded detail (rendered below table as a separate section) */}
      {expandedId && (() => {
        const entry = entries.find((e) => e.id === expandedId);
        if (!entry) return null;
        return (
          <div className="mt-2 rounded-xl border p-4" style={{ borderColor: "var(--a-border)", background: "var(--a-card)" }}>
            <div className="mb-2 text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
              {entry.action} {entry.entity} — {new Date(entry.created_at).toLocaleString("uk-UA")}
              {entry.ip_address && <span className="ml-2">IP: {entry.ip_address}</span>}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-medium" style={{ color: "#ef4444" }}>До (before)</div>
                {renderJson(entry.before_data, "rgba(239,68,68,0.05)")}
              </div>
              <div>
                <div className="mb-1 text-xs font-medium" style={{ color: "#22c55e" }}>Після (after)</div>
                {renderJson(entry.after_data, "rgba(34,197,94,0.05)")}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40" style={{ borderColor: "var(--a-border)", color: "var(--a-text-secondary)" }}>
            ←
          </button>
          <span className="text-xs" style={{ color: "var(--a-text-secondary)" }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40" style={{ borderColor: "var(--a-border)", color: "var(--a-text-secondary)" }}>
            →
          </button>
        </div>
      )}
    </div>
  );
}
