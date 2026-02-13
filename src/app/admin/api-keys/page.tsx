"use client";

// ================================================================
//  Admin: API Ключі — Управління токенами для 1С та зовнішніх систем
// ================================================================

import React, { useState, useEffect, useCallback } from "react";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Power,
  PowerOff,
  Eye,
  AlertCircle,
  Clock,
  Activity,
  Shield,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { ApiBreadcrumb } from "@/components/admin/ApiBreadcrumb";

/* ────────────────────────────────────────────── types ── */

interface ApiToken {
  id: string;
  name: string;
  token_prefix: string;
  permissions: string[];
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  stats: { requests_24h: number; errors_24h: number };
}

interface LogEntry {
  id: string;
  method: string;
  endpoint: string;
  status_code: number;
  response_time_ms: number;
  error_message: string | null;
  ip_address: string;
  created_at: string;
  api_tokens: { name: string; token_prefix: string } | null;
}

const ALL_PERMISSIONS = [
  { key: "products:read", label: "Товари: читання", group: "Товари" },
  { key: "products:write", label: "Товари: запис", group: "Товари" },
  { key: "customers:read", label: "Клієнти: читання", group: "Клієнти" },
  { key: "customers:write", label: "Клієнти: запис", group: "Клієнти" },
  { key: "orders:read", label: "Замовлення: читання", group: "Замовлення" },
  { key: "orders:write", label: "Замовлення: запис", group: "Замовлення" },
  { key: "documents:write", label: "Накладні: запис", group: "Документи" },
  { key: "payments:read", label: "Оплати: читання", group: "Оплати" },
  { key: "payments:write", label: "Оплати: запис", group: "Оплати" },
  { key: "bonuses:read", label: "Бонуси: читання", group: "Бонуси" },
  { key: "bonuses:write", label: "Бонуси: запис", group: "Бонуси" },
  { key: "prices:write", label: "B2B ціни: запис", group: "Ціни" },
];

const RATE_LIMITS = [10, 30, 60, 100, 300];
const EXPIRE_OPTIONS = [
  { value: 0, label: "Безстроковий" },
  { value: 30, label: "30 днів" },
  { value: 90, label: "90 днів" },
  { value: 365, label: "1 рік" },
];

/* ────────────────────────────────────────────── helpers ── */

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(d: string | null): string {
  if (!d) return "ніколи";
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60_000) return "щойно";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} хв тому`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} год тому`;
  if (diff < 2592000_000) return `${Math.floor(diff / 86400_000)} дн тому`;
  return fmtDate(d);
}

function statusColor(code: number) {
  if (code < 300) return { c: "#4ade80", bg: "#052e16" };
  if (code < 400) return { c: "#fbbf24", bg: "#422006" };
  if (code < 500) return { c: "#fb923c", bg: "#431407" };
  return { c: "#f87171", bg: "#450a0a" };
}

/* ────────────────────────────────────────────── component ── */

export default function ApiKeysPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsMeta, setLogsMeta] = useState({ total: 0, page: 1, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tokens" | "logs">("tokens");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAllowedIps, setNewAllowedIps] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>([]);
  const [newRate, setNewRate] = useState(100);
  const [newExpire, setNewExpire] = useState(0);
  const [creating, setCreating] = useState(false);

  // Token shown once
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Expanded token details
  const [expandedToken, setExpandedToken] = useState<string | null>(null);

  // Log filters
  const [logTokenFilter, setLogTokenFilter] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState("");

  /* ── fetch tokens ── */
  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/api-tokens");
      const json = await res.json();
      setTokens(json.data || []);
    } catch {
      /* ignore */
    }
  }, []);

  /* ── fetch logs ── */
  const fetchLogs = useCallback(
    async (page = 1) => {
      try {
        const params = new URLSearchParams({ page: String(page), per_page: "50" });
        if (logTokenFilter) params.set("token_id", logTokenFilter);
        if (logStatusFilter) params.set("status_code", logStatusFilter);

        const res = await fetch(`/api/admin/api-tokens/log?${params}`);
        const json = await res.json();
        setLogs(json.data || []);
        setLogsMeta(json.meta || { total: 0, page: 1, total_pages: 0 });
      } catch {
        /* ignore */
      }
    },
    [logTokenFilter, logStatusFilter]
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTokens(), fetchLogs()]).finally(() => setLoading(false));
  }, [fetchTokens, fetchLogs]);

  /* ── create token ── */
  async function handleCreate() {
    if (!newName.trim() || newPerms.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/api-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          description: newDescription || null,
          allowed_ips: newAllowedIps ? newAllowedIps.split(/[,\s]+/).map(s => s.trim()).filter(Boolean) : null,
          permissions: newPerms,
          rate_limit: newRate,
          expires_in_days: newExpire || null,
        }),
      });
      const json = await res.json();
      if (json.data?.token) {
        setCreatedToken(json.data.token);
        await fetchTokens();
      }
    } catch {
      /* ignore */
    } finally {
      setCreating(false);
    }
  }

  /* ── toggle active ── */
  async function toggleActive(token: ApiToken) {
    await fetch("/api/admin/api-tokens", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: token.id, is_active: !token.is_active }),
    });
    await fetchTokens();
  }

  /* ── delete token ── */
  async function deleteToken(id: string) {
    if (!confirm("Видалити цей токен? Це дія незворотна.")) return;
    await fetch("/api/admin/api-tokens", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchTokens();
  }

  /* ── copy to clipboard ── */
  async function copyToken() {
    if (!createdToken) return;
    await navigator.clipboard.writeText(createdToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* ── select all perms ── */
  function toggleAllPerms() {
    if (newPerms.length === ALL_PERMISSIONS.length) {
      setNewPerms([]);
    } else {
      setNewPerms(ALL_PERMISSIONS.map((p) => p.key));
    }
  }

  function closeCreateModal() {
    setShowCreate(false);
    setCreatedToken(null);
    setNewName("");
    setNewDescription("");
    setNewAllowedIps("");
    setNewPerms([]);
    setNewRate(100);
    setNewExpire(0);
    setCopied(false);
  }

  /* ────────────────────────────────── render ── */
  return (
    <div>
      <ApiBreadcrumb current="API Ключі" icon={Key} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-2xl font-semibold mb-1 flex items-center gap-3"
            style={{ color: "var(--a-text)" }}
          >
            <Key className="w-6 h-6" style={{ color: "var(--a-accent)" }} />
            API Ключі
          </h1>
          <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
            Створюйте токени для зовнішніх систем. Кожен токен має свої права, ліміт запитів та опціональний IP whitelist.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchTokens(); fetchLogs(); }}
            className="p-2 rounded-lg transition-colors"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-3)" }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--a-accent-btn)", color: "#fff" }}
          >
            <Plus className="w-4 h-4" /> Створити токен
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "tokens" as const, label: "Токени", icon: Shield },
          { key: "logs" as const, label: "Лог запитів", icon: Activity },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === "logs") fetchLogs();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={
              activeTab === tab.key
                ? { background: "var(--a-accent-bg)", color: "var(--a-accent)", border: "1px solid var(--a-accent)" }
                : { background: "var(--a-bg-card)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }
            }
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "var(--a-text-3)" }} />
        </div>
      )}

      {/* ─────────────── Tab: Tokens ─────────────── */}
      {!loading && activeTab === "tokens" && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                  <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Назва</th>
                  <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--a-text-5)" }}>Токен</th>
                  <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--a-text-5)" }}>Права</th>
                  <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider hidden lg:table-cell" style={{ color: "var(--a-text-5)" }}>Rate limit</th>
                  <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider hidden lg:table-cell" style={{ color: "var(--a-text-5)" }}>Запити / 24г</th>
                  <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Остання дія</th>
                  <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Статус</th>
                  <th className="w-24 px-2 py-3 text-[11px] font-medium uppercase tracking-wider text-right" style={{ color: "var(--a-text-5)" }}>Дії</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <React.Fragment key={t.id}>
                    <tr
                      className="transition-colors cursor-pointer"
                      style={{ borderBottom: "1px solid var(--a-border)" }}
                      onClick={() => setExpandedToken(expandedToken === t.id ? null : t.id)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium" style={{ color: "var(--a-text)" }}>{t.name}</span>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--a-text-5)" }}>{fmtDate(t.created_at)}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <code className="text-xs font-mono px-2 py-1 rounded" style={{ background: "var(--a-bg-input)", color: "var(--a-text-3)" }}>
                          {t.token_prefix}••••••
                        </code>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "var(--a-accent-bg)", color: "var(--a-accent)" }}>
                          {t.permissions.length} прав
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <span className="text-xs" style={{ color: "var(--a-text-3)" }}>{t.rate_limit}/хв</span>
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <span className="text-xs font-mono" style={{ color: "var(--a-text-2)" }}>{t.stats.requests_24h}</span>
                        {t.stats.errors_24h > 0 && (
                          <span className="ml-1 text-xs font-mono" style={{ color: "#f87171" }}>
                            ({t.stats.errors_24h} err)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: "var(--a-text-3)" }}>{relativeTime(t.last_used_at)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={
                            t.is_active
                              ? { color: "#4ade80", background: "#052e16" }
                              : { color: "#f87171", background: "#450a0a" }
                          }
                        >
                          {t.is_active ? "Активний" : "Вимкнений"}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleActive(t)}
                            className="p-1.5 rounded-lg transition-colors"
                            title={t.is_active ? "Вимкнути" : "Увімкнути"}
                            style={{ color: t.is_active ? "#4ade80" : "var(--a-text-3)" }}
                          >
                            {t.is_active ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => deleteToken(t.id)}
                            className="p-1.5 rounded-lg transition-colors"
                            title="Видалити"
                            style={{ color: "var(--a-text-3)" }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {expandedToken === t.id ? (
                            <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--a-text-5)" }} />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--a-text-5)" }} />
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded details */}
                    {expandedToken === t.id && (
                      <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                        <td colSpan={8} className="px-4 py-4" style={{ background: "var(--a-bg)" }}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--a-text-5)" }}>
                                Права доступу
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {t.permissions.map((p) => (
                                  <span
                                    key={p}
                                    className="px-2 py-0.5 rounded text-[10px] font-mono"
                                    style={{ background: "var(--a-bg-input)", color: "var(--a-text-2)" }}
                                  >
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--a-text-5)" }}>
                                Деталі
                              </h4>
                              <div className="space-y-1 text-xs" style={{ color: "var(--a-text-3)" }}>
                                <p>Rate limit: <span style={{ color: "var(--a-text-2)" }}>{t.rate_limit} запитів/хв</span></p>
                                <p>Термін дії: <span style={{ color: "var(--a-text-2)" }}>{t.expires_at ? fmtDate(t.expires_at) : "безстроковий"}</span></p>
                                <p>Створено: <span style={{ color: "var(--a-text-2)" }}>{fmtDate(t.created_at)}</span></p>
                                <p>Запитів за 24г: <span style={{ color: "var(--a-text-2)" }}>{t.stats.requests_24h}</span></p>
                                <p>Помилок за 24г: <span style={{ color: t.stats.errors_24h > 0 ? "#f87171" : "var(--a-text-2)" }}>{t.stats.errors_24h}</span></p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {tokens.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center" style={{ color: "var(--a-text-5)" }}>
                      <Key className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p>Ще немає API-токенів</p>
                      <p className="text-xs mt-1">Створіть перший токен для інтеграції з 1С</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────── Tab: Logs ─────────────── */}
      {!loading && activeTab === "logs" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={logTokenFilter}
              onChange={(e) => setLogTokenFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: "var(--a-bg-card)", color: "var(--a-text-2)", border: "1px solid var(--a-border)" }}
            >
              <option value="">Всі токени</option>
              {tokens.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.token_prefix})</option>
              ))}
            </select>
            <select
              value={logStatusFilter}
              onChange={(e) => setLogStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: "var(--a-bg-card)", color: "var(--a-text-2)", border: "1px solid var(--a-border)" }}
            >
              <option value="">Всі статуси</option>
              <option value="200">200 OK</option>
              <option value="400">400 Bad Request</option>
              <option value="401">401 Unauthorized</option>
              <option value="403">403 Forbidden</option>
              <option value="429">429 Rate Limited</option>
              <option value="500">500 Server Error</option>
            </select>
            <button
              onClick={() => fetchLogs()}
              className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
              style={{ background: "var(--a-bg-card)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}
            >
              <RefreshCw className="w-3 h-3" /> Оновити
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                    <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Час</th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--a-text-5)" }}>Токен</th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Метод</th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Endpoint</th>
                    <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Статус</th>
                    <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--a-text-5)" }}>Час (ms)</th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider hidden lg:table-cell" style={{ color: "var(--a-text-5)" }}>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const sc = statusColor(log.status_code);
                    return (
                      <tr
                        key={log.id}
                        className="transition-colors"
                        style={{ borderBottom: "1px solid var(--a-border)" }}
                      >
                        <td className="px-4 py-2.5 text-xs" style={{ color: "var(--a-text-3)" }}>{fmtDate(log.created_at)}</td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <span className="text-xs" style={{ color: "var(--a-text-2)" }}>
                            {log.api_tokens?.name || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                            style={{
                              background: "var(--a-bg-input)",
                              color:
                                log.method === "GET"
                                  ? "#4ade80"
                                  : log.method === "POST"
                                  ? "#60a5fa"
                                  : log.method === "PATCH"
                                  ? "#fbbf24"
                                  : "#f87171",
                            }}
                          >
                            {log.method}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <code className="text-xs font-mono" style={{ color: "var(--a-text-2)" }}>{log.endpoint}</code>
                          {log.error_message && log.status_code >= 400 && (
                            <p className="text-[10px] mt-0.5" style={{ color: "#f87171" }}>{log.error_message}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium"
                            style={{ color: sc.c, background: sc.bg }}
                          >
                            {log.status_code}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs font-mono hidden md:table-cell" style={{ color: "var(--a-text-3)" }}>
                          {log.response_time_ms}ms
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono hidden lg:table-cell" style={{ color: "var(--a-text-5)" }}>
                          {log.ip_address}
                        </td>
                      </tr>
                    );
                  })}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center" style={{ color: "var(--a-text-5)" }}>
                        <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
                        <p>Ще немає записів у лозі</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logsMeta.total_pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--a-border)" }}>
                <p className="text-xs" style={{ color: "var(--a-text-5)" }}>
                  Сторінка {logsMeta.page} з {logsMeta.total_pages} ({logsMeta.total} записів)
                </p>
                <div className="flex gap-1">
                  {logsMeta.page > 1 && (
                    <button
                      onClick={() => fetchLogs(logsMeta.page - 1)}
                      className="px-2.5 py-1 rounded-lg text-xs"
                      style={{ color: "var(--a-text-3)", background: "var(--a-bg-card)" }}
                    >
                      ←
                    </button>
                  )}
                  {logsMeta.page < logsMeta.total_pages && (
                    <button
                      onClick={() => fetchLogs(logsMeta.page + 1)}
                      className="px-2.5 py-1 rounded-lg text-xs"
                      style={{ color: "var(--a-text-3)", background: "var(--a-bg-card)" }}
                    >
                      →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─────────────── Create Token Modal ─────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--a-border)" }}>
              <h2 className="text-lg font-semibold" style={{ color: "var(--a-text)" }}>
                {createdToken ? "Токен створено" : "Створити API-токен"}
              </h2>
              <button onClick={closeCreateModal} style={{ color: "var(--a-text-3)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Token created - show once */}
            {createdToken ? (
              <div className="p-6">
                <div className="flex items-start gap-3 mb-4 p-3 rounded-lg" style={{ background: "#1c1917", border: "1px solid #422006" }}>
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />
                  <p className="text-sm" style={{ color: "#fbbf24" }}>
                    Скопіюйте токен зараз. Він більше не буде показаний.
                  </p>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={createdToken}
                    className="w-full px-3 py-2.5 pr-10 rounded-lg text-xs font-mono"
                    style={{ background: "var(--a-bg-input)", color: "var(--a-text)", border: "1px solid var(--a-border)" }}
                  />
                  <button
                    onClick={copyToken}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
                    style={{ color: copied ? "#4ade80" : "var(--a-text-3)" }}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-xs mt-3" style={{ color: "var(--a-text-5)" }}>
                  Передайте цей токен програмісту 1С. Він використовуватиметься як Bearer-токен в заголовку Authorization.
                </p>

                <button
                  onClick={closeCreateModal}
                  className="mt-4 w-full py-2 rounded-lg text-sm font-medium"
                  style={{ background: "var(--a-accent-btn)", color: "#fff" }}
                >
                  Готово
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>Назва</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="1С Обмін"
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--a-bg-input)", color: "var(--a-text)", border: "1px solid var(--a-border)" }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>Опис (необов&apos;язково)</label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Токен для обміну даними з 1С бухгалтера Ірини"
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--a-bg-input)", color: "var(--a-text)", border: "1px solid var(--a-border)" }}
                  />
                </div>

                {/* IP Whitelist */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>IP Whitelist (необов&apos;язково)</label>
                  <input
                    type="text"
                    value={newAllowedIps}
                    onChange={(e) => setNewAllowedIps(e.target.value)}
                    placeholder="194.44.12.1, 10.0.0.5"
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--a-bg-input)", color: "var(--a-text)", border: "1px solid var(--a-border)" }}
                  />
                  <p className="mt-1 text-[10px]" style={{ color: "var(--a-text-4)" }}>Якщо вказано — запити з інших IP будуть відхилені (403). Через кому.</p>
                </div>

                {/* Permissions */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium" style={{ color: "var(--a-text-3)" }}>Права доступу</label>
                    <button
                      onClick={toggleAllPerms}
                      className="text-[11px] font-medium"
                      style={{ color: "var(--a-accent)" }}
                    >
                      {newPerms.length === ALL_PERMISSIONS.length ? "Зняти всі" : "Обрати всі"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_PERMISSIONS.map((p) => (
                      <label
                        key={p.key}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                        style={{
                          background: newPerms.includes(p.key) ? "var(--a-accent-bg)" : "var(--a-bg-input)",
                          border: `1px solid ${newPerms.includes(p.key) ? "var(--a-accent)" : "var(--a-border)"}`,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={newPerms.includes(p.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewPerms([...newPerms, p.key]);
                            } else {
                              setNewPerms(newPerms.filter((x) => x !== p.key));
                            }
                          }}
                          className="sr-only"
                        />
                        <div
                          className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0"
                          style={{
                            borderColor: newPerms.includes(p.key) ? "var(--a-accent)" : "var(--a-text-5)",
                            background: newPerms.includes(p.key) ? "var(--a-accent-btn)" : "transparent",
                          }}
                        >
                          {newPerms.includes(p.key) && <Check className="w-2.5 h-2.5" style={{ color: "#fff" }} />}
                        </div>
                        <span className="text-[11px]" style={{ color: newPerms.includes(p.key) ? "var(--a-accent)" : "var(--a-text-3)" }}>
                          {p.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rate limit */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>Rate limit</label>
                  <div className="flex gap-2">
                    {RATE_LIMITS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setNewRate(r)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={
                          newRate === r
                            ? { background: "var(--a-accent-bg)", color: "var(--a-accent)", border: "1px solid var(--a-accent)" }
                            : { background: "var(--a-bg-input)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }
                        }
                      >
                        {r}/хв
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expiry */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>Термін дії</label>
                  <div className="flex gap-2">
                    {EXPIRE_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        onClick={() => setNewExpire(o.value)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={
                          newExpire === o.value
                            ? { background: "var(--a-accent-bg)", color: "var(--a-accent)", border: "1px solid var(--a-accent)" }
                            : { background: "var(--a-bg-input)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }
                        }
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim() || newPerms.length === 0}
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
                  style={{ background: "var(--a-accent-btn)", color: "#fff" }}
                >
                  {creating ? "Створення..." : "Створити токен"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
