"use client";

// ================================================================
//  Admin: Вебхуки — Управління сповіщеннями для зовнішніх систем
// ================================================================

import { useState, useEffect, useCallback } from "react";
import {
  Webhook, Plus, Trash2, Power, PowerOff, Check, Copy, AlertCircle,
  Send, Eye, X, RefreshCw, Globe,
} from "lucide-react";
import { ApiBreadcrumb } from "@/components/admin/ApiBreadcrumb";
import { WEBHOOK_EVENTS } from "@/lib/api/webhook-events";

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  retry_count: number;
  timeout_ms: number;
  last_status: number | null;
  last_error: string | null;
  last_fired_at: string | null;
  success_count: number;
  error_count: number;
  created_at: string;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Create form
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/webhooks");
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
      }
    } catch { /* */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const handleCreate = async () => {
    if (!name || !url || events.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, events }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedSecret(data.webhook?.secret || null);
        setShowCreate(false);
        setName(""); setUrl(""); setEvents([]);
        fetchWebhooks();
      }
    } catch { /* */ } finally { setCreating(false); }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch("/api/admin/webhooks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !isActive }),
    });
    fetchWebhooks();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Видалити вебхук?")) return;
    await fetch("/api/admin/webhooks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchWebhooks();
  };

  const toggleEvent = (event: string) => {
    setEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]);
  };

  const copySecret = () => {
    if (createdSecret) {
      navigator.clipboard.writeText(createdSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <ApiBreadcrumb current="Вебхуки" icon={Webhook} />
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Webhook className="h-6 w-6 text-purple-400" /> Вебхуки
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Автоматичні POST-запити на ваш URL при подіях на сайті. Підпис HMAC-SHA256, retry при помилках.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchWebhooks} className="flex items-center gap-1.5 rounded-lg bg-[#111116] px-3 py-2 text-sm text-zinc-400 border border-[#1e1e2a] hover:text-white transition-colors">
            <RefreshCw className="h-4 w-4" /> Оновити
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 transition-colors">
            <Plus className="h-4 w-4" /> Створити вебхук
          </button>
        </div>
      </div>

      {/* Secret shown once */}
      {createdSecret && (
        <div className="mb-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-300">Вебхук створено! Збережіть secret — він показується один раз.</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-xs font-mono text-emerald-300 break-all">{createdSecret}</code>
                <button onClick={copySecret} className="shrink-0 rounded-lg bg-emerald-500/20 p-2 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">
                Використовуйте заголовок <code className="text-zinc-400">X-Webhook-Signature</code> для верифікації підпису (HMAC-SHA256).
              </p>
            </div>
            <button onClick={() => setCreatedSecret(null)} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="mb-6 rounded-xl bg-[#111116] border border-[#1e1e2a] p-4">
        <h3 className="text-xs font-semibold text-zinc-400 mb-2">Як це працює</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] text-zinc-500">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 text-[9px] font-bold">1</div>
            <span>Подія на сайті (нове замовлення, оновлення залишків і т.д.)</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 text-[9px] font-bold">2</div>
            <span>Сайт відправляє POST-запит на ваш URL з підписом HMAC-SHA256</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 text-[9px] font-bold">3</div>
            <span>Ваш сервіс обробляє дані. При помилці — до 3 повторних спроб</span>
          </div>
        </div>
      </div>

      {/* Webhooks list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1e1e2a] border-t-purple-500" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="rounded-xl bg-[#111116] border border-[#1e1e2a] p-12 text-center">
          <Webhook className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 mb-1">Немає вебхуків</p>
          <p className="text-xs text-zinc-600">Створіть перший вебхук для отримання сповіщень</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(wh => (
            <div key={wh.id} className="rounded-xl bg-[#111116] border border-[#1e1e2a] p-4">
              <div className="flex items-start gap-4">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${wh.is_active ? "bg-emerald-400" : "bg-zinc-600"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-white">{wh.name}</h3>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${wh.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-500"}`}>
                      {wh.is_active ? "Активний" : "Вимкнений"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Globe className="h-3 w-3 text-zinc-600" />
                    <code className="text-[11px] text-zinc-500 truncate">{wh.url}</code>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {wh.events.map(ev => (
                      <span key={ev} className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[9px] text-purple-400 border border-purple-500/20">{ev}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-zinc-600">
                    <span>Успішних: <span className="text-emerald-400">{wh.success_count}</span></span>
                    <span>Помилок: <span className="text-red-400">{wh.error_count}</span></span>
                    {wh.last_status && <span>Статус: <span className={wh.last_status < 300 ? "text-emerald-400" : "text-red-400"}>{wh.last_status}</span></span>}
                    <span>Останній: {fmtDate(wh.last_fired_at)}</span>
                  </div>
                  {wh.last_error && (
                    <p className="mt-1 text-[10px] text-red-400/60 truncate">{wh.last_error}</p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggle(wh.id, wh.is_active)}
                    className="rounded-lg p-2 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                    title={wh.is_active ? "Вимкнути" : "Увімкнути"}
                  >
                    {wh.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    className="rounded-lg p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Видалити"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg mx-4 rounded-2xl bg-[#0c0c12] border border-[#1e1e2a] shadow-2xl overflow-y-auto max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-[#1e1e2a]">
              <h2 className="text-lg font-semibold text-white">Новий вебхук</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-lg hover:bg-[#1a1a24] text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Назва *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="1С Сповіщення"
                  className="w-full px-3 py-2 rounded-lg bg-[#111116] border border-[#1e1e2a] text-sm text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">URL *</label>
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/webhook"
                  className="w-full px-3 py-2 rounded-lg bg-[#111116] border border-[#1e1e2a] text-sm text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">Події *</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {WEBHOOK_EVENTS.map(ev => (
                    <label key={ev.event} className="flex items-center gap-2 rounded-lg bg-[#111116] border border-[#1e1e2a] px-3 py-2 cursor-pointer hover:border-[#27272a] transition-colors">
                      <input type="checkbox" checked={events.includes(ev.event)} onChange={() => toggleEvent(ev.event)}
                        className="rounded border-zinc-600 bg-transparent text-purple-500 focus:ring-purple-500 focus:ring-offset-0" />
                      <div>
                        <div className="text-[11px] text-zinc-300">{ev.label}</div>
                        <div className="text-[9px] text-zinc-600 font-mono">{ev.event}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreate}
                disabled={creating || !name || !url || events.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {creating ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send className="h-4 w-4" />}
                {creating ? "Створення..." : "Створити вебхук"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
