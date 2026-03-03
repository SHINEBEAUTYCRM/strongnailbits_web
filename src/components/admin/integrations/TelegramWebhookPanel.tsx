"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Check, AlertCircle, Globe, Webhook, Trash2 } from "lucide-react";

interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
  ip_address?: string;
}

interface BotInfo {
  id: number;
  first_name: string;
  username: string;
}

export function TelegramWebhookPanel() {
  const [loading, setLoading] = useState(true);
  const [bot, setBot] = useState<BotInfo | null>(null);
  const [webhook, setWebhook] = useState<WebhookInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{ ok: boolean; message: string } | null>(null);

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/telegram-webhook-manage");
      const data = await res.json();
      if (data.ok) {
        setBot(data.bot);
        setWebhook(data.webhook);
      } else {
        setError(data.error || "Не вдалось отримати інформацію");
      }
    } catch {
      setError("Помилка мережі");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  const handleSetWebhook = async () => {
    setActionLoading(true);
    setActionResult(null);
    try {
      const res = await fetch("/api/admin/telegram-webhook-manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setActionResult({
        ok: data.ok,
        message: data.ok
          ? `Webhook встановлено: ${data.webhookUrl}`
          : data.description || data.error || "Помилка",
      });
      if (data.ok) fetchInfo();
    } catch {
      setActionResult({ ok: false, message: "Помилка мережі" });
    }
    setActionLoading(false);
  };

  const handleDeleteWebhook = async () => {
    setActionLoading(true);
    setActionResult(null);
    try {
      const res = await fetch("/api/admin/telegram-webhook-manage", {
        method: "DELETE",
      });
      const data = await res.json();
      setActionResult({
        ok: data.ok,
        message: data.ok ? "Webhook видалено" : data.error || "Помилка",
      });
      if (data.ok) fetchInfo();
    } catch {
      setActionResult({ ok: false, message: "Помилка мережі" });
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto" style={{ color: "var(--a-text-4)" }} />
        <p className="text-xs mt-2" style={{ color: "var(--a-text-3)" }}>Завантаження...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchInfo}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-2)" }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Спробувати знову
        </button>
      </div>
    );
  }

  const hasWebhook = webhook?.url && webhook.url.length > 0;
  const lastError = webhook?.last_error_date
    ? new Date(webhook.last_error_date * 1000).toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })
    : null;

  return (
    <div className="space-y-4">
      {/* Bot Info */}
      {bot && (
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
          <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--a-text)" }}>
              {bot.first_name}
            </p>
            <p className="text-[11px]" style={{ color: "var(--a-text-3)" }}>
              @{bot.username} &middot; ID: {bot.id}
            </p>
          </div>
        </div>
      )}

      {/* Webhook Status */}
      <div className="p-3 rounded-lg" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Webhook className="w-4 h-4" style={{ color: hasWebhook ? "#22c55e" : "#ef4444" }} />
          <p className="text-xs font-medium" style={{ color: "var(--a-text)" }}>
            {hasWebhook ? "Webhook активний" : "Webhook не встановлено"}
          </p>
        </div>

        {hasWebhook && (
          <div className="space-y-1.5 text-[11px]" style={{ color: "var(--a-text-3)" }}>
            <p className="flex items-start gap-1.5">
              <Globe className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span className="break-all font-mono">{webhook.url}</span>
            </p>
            <p>Очікує: {webhook.pending_update_count} оновлень</p>
            {webhook.ip_address && <p>IP: {webhook.ip_address}</p>}
            {webhook.allowed_updates && (
              <p>Events: {webhook.allowed_updates.join(", ")}</p>
            )}
            {lastError && (
              <p className="text-red-400">
                Остання помилка: {lastError}
                {webhook.last_error_message && ` — ${webhook.last_error_message}`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Result */}
      {actionResult && (
        <div
          className={`flex items-start gap-2 p-3 rounded-lg border ${
            actionResult.ok
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {actionResult.ok ? (
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          <p className="text-xs break-all">{actionResult.message}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSetWebhook}
          disabled={actionLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Webhook className="w-4 h-4" />}
          {hasWebhook ? "Перевстановити Webhook" : "Встановити Webhook"}
        </button>
        {hasWebhook && (
          <button
            onClick={handleDeleteWebhook}
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg disabled:opacity-50 text-sm font-medium border transition-colors"
            style={{ background: "var(--a-bg-card)", borderColor: "var(--a-border)", color: "var(--a-text-2)" }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Refresh */}
      <button
        onClick={fetchInfo}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] transition-colors"
        style={{ color: "var(--a-text-4)" }}
      >
        <RefreshCw className="w-3 h-3" /> Оновити статус
      </button>
    </div>
  );
}
