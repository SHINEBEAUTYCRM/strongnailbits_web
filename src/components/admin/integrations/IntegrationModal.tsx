"use client";

// ================================================================
//  IntegrationModal — Модальне вікно налаштування інтеграції
// ================================================================

import { useState, useEffect, useCallback } from "react";
import { X, ExternalLink, Check, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import type { ServiceDefinition, IntegrationStatusItem } from "@/lib/integrations/types";
import { IntegrationStatus } from "./IntegrationStatus";
import { IntegrationLogs } from "./IntegrationLogs";

/* ── Health data type ── */
interface HealthData {
  slug: string;
  status: string;
  responseTimeMs: number;
  error: string | null;
  details: Record<string, unknown>;
}

/* ── Event row for inline list ── */
interface EventRow {
  id: string;
  topic: string;
  status: string;
  created_at?: string;
  received_at?: string;
  target_slug?: string;
  provider_slug?: string;
  attempts?: number;
}

interface IntegrationModalProps {
  service: ServiceDefinition;
  status?: IntegrationStatusItem;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function IntegrationModal({
  service,
  status,
  isOpen,
  onClose,
  onSaved,
}: IntegrationModalProps) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"config" | "logs" | "health" | "events">("config");
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [recentEvents, setRecentEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Ініціалізувати порожні поля
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {};
      for (const field of service.requiredFields) {
        initial[field.key] = "";
      }
      setConfig(initial);
      setVerifyResult(null);
      setActiveTab("config");
      setHealthData(null);
      setRecentEvents([]);
    }
  }, [isOpen, service]);

  // Fetch health when Health tab is opened
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/integrations/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: service.slug }),
      });
      const json = await res.json();
      setHealthData(json);
    } catch {
      setHealthData(null);
    }
    setHealthLoading(false);
  }, [service.slug]);

  // Fetch events when Events tab is opened
  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const [outRes, inRes] = await Promise.all([
        fetch(`/api/integrations/events?direction=outbox&slug=${service.slug}&limit=10`),
        fetch(`/api/integrations/events?direction=inbox&slug=${service.slug}&limit=10`),
      ]);
      const outJson = await outRes.json();
      const inJson = await inRes.json();
      const merged = [
        ...(outJson.data || []).map((e: EventRow) => ({ ...e, _dir: "out" })),
        ...(inJson.data || []).map((e: EventRow) => ({ ...e, _dir: "in" })),
      ].sort((a: EventRow & { _dir: string }, b: EventRow & { _dir: string }) => {
        const tA = a.created_at || a.received_at || "";
        const tB = b.created_at || b.received_at || "";
        return tB.localeCompare(tA);
      }).slice(0, 10);
      setRecentEvents(merged);
    } catch {
      setRecentEvents([]);
    }
    setEventsLoading(false);
  }, [service.slug]);

  useEffect(() => {
    if (activeTab === "health" && !healthData && !healthLoading) fetchHealth();
    if (activeTab === "events" && recentEvents.length === 0 && !eventsLoading) fetchEvents();
  }, [activeTab, healthData, healthLoading, fetchHealth, recentEvents.length, eventsLoading, fetchEvents]);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setVerifyResult(null);
  }, []);

  // Зберегти конфігурацію
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: service.slug, config }),
      });

      if (!res.ok) {
        const err = await res.json();
        setVerifyResult({ success: false, message: err.error || "Помилка збереження" });
        return;
      }

      setVerifyResult({ success: true, message: "Ключі збережено" });
      onSaved();
    } catch (err) {
      console.error('[IntegrationModal] Save failed:', err);
      setVerifyResult({ success: false, message: "Помилка мережі" });
    } finally {
      setSaving(false);
    }
  };

  // Верифікувати з'єднання
  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      console.log("[IntegrationModal] verify slug:", service.slug, "config keys:", Object.keys(config), "values exist:", Object.entries(config).map(([k,v]) => `${k}:${v ? v.length : 0}`));
      const res = await fetch(`/api/integrations/${service.slug}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      const result = await res.json();
      setVerifyResult({ success: result.success, message: result.message });
      if (result.success) {
        onSaved();
      }
    } catch (err) {
      console.error('[IntegrationModal] Verify failed:', err);
      setVerifyResult({ success: false, message: "Помилка мережі" });
    } finally {
      setVerifying(false);
    }
  };

  // Деактивувати
  const handleDeactivate = async () => {
    setSaving(true);
    try {
      await fetch("/api/integrations/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: service.slug }),
      });
      setVerifyResult({ success: true, message: "Інтеграцію деактивовано" });
      onSaved();
    } catch (err) {
      console.error('[IntegrationModal] Deactivate failed:', err);
      setVerifyResult({ success: false, message: "Помилка деактивації" });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const hasFields = service.requiredFields.length > 0;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto rounded-2xl bg-[var(--a-bg)] border border-[var(--a-border)] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 pb-4 bg-[var(--a-bg)] border-b border-[var(--a-border)]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--a-text)]">{service.name}</h2>
              <IntegrationStatus
                isActive={status?.isActive ?? false}
                isVerified={status?.isVerified ?? false}
                hasConfig={status?.hasConfig ?? false}
                errorMessage={status?.errorMessage}
                size="md"
              />
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-[var(--a-text-3)]">{service.module}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--a-bg-hover)] text-[var(--a-text-2)] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <div className="px-5 py-3 border-b border-[var(--a-border)]">
          <p className="text-sm text-[var(--a-text-2)]">{service.description}</p>
          {service.docsUrl && (
            <a
              href={service.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-purple-400 hover:text-purple-300"
            >
              Документація <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--a-border)]">
          {(
            [
              { id: "config" as const, label: "Налаштування" },
              { id: "logs" as const, label: "Логи" },
              { id: "health" as const, label: "Здоров'я" },
              { id: "events" as const, label: "Події" },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-purple-400 border-b-2 border-purple-500"
                  : "text-[var(--a-text-3)] hover:text-[var(--a-text-2)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* ── Config Tab ── */}
          {activeTab === "config" && (
            <div className="space-y-4">
              {hasFields ? (
                <>
                  {service.requiredFields.map(field => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-[var(--a-text-body)] mb-1.5">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-0.5">*</span>}
                      </label>
                      {field.type === "select" && field.options ? (
                        <select
                          value={config[field.key] || ""}
                          onChange={e => handleFieldChange(field.key, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--a-bg-card)] border border-[var(--a-border)] text-sm text-[var(--a-text)] focus:border-purple-500 focus:outline-none transition-colors"
                        >
                          <option value="">Оберіть...</option>
                          {field.options.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type === "password" ? "password" : "text"}
                          value={config[field.key] || ""}
                          onChange={e => handleFieldChange(field.key, e.target.value)}
                          placeholder={field.placeholder || ""}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--a-bg-card)] border border-[var(--a-border)] text-sm text-[var(--a-text)] placeholder:text-[var(--a-text-4)] focus:border-purple-500 focus:outline-none transition-colors"
                        />
                      )}
                      {field.helpText && (
                        <p className="text-[11px] text-[var(--a-text-4)] mt-1">{field.helpText}</p>
                      )}
                    </div>
                  ))}

                  {verifyResult && (
                    <div
                      className={`flex items-start gap-2 p-3 rounded-lg border ${
                        verifyResult.success
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}
                    >
                      {verifyResult.success ? (
                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      <p className="text-xs">{verifyResult.message}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleVerify}
                      disabled={verifying || saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                    >
                      {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {verifying ? "Перевірка..." : "Перевірити і зберегти"}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || verifying}
                      className="px-4 py-2.5 rounded-lg bg-[var(--a-bg-hover)] hover:bg-[var(--a-bg-hover)] disabled:opacity-50 text-[var(--a-text-body)] text-sm font-medium border border-[var(--a-border)] transition-colors"
                    >
                      {saving ? "..." : "Зберегти"}
                    </button>
                  </div>

                  {status?.isActive && (
                    <button
                      onClick={handleDeactivate}
                      disabled={saving}
                      className="w-full mt-2 py-2 text-xs text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      Деактивувати інтеграцію
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-[var(--a-text-2)] mb-2">
                    Вбудована функція — не потребує API-ключів
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Logs Tab ── */}
          {activeTab === "logs" && <IntegrationLogs slug={service.slug} />}

          {/* ── Health Tab ── */}
          {activeTab === "health" && (
            <div className="space-y-4">
              {healthLoading ? (
                <div className="py-8 text-center">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto" style={{ color: "var(--a-text-4)" }} />
                  <p className="text-xs mt-2" style={{ color: "var(--a-text-3)" }}>Перевіряю з&apos;єднання...</p>
                </div>
              ) : healthData ? (
                <>
                  {/* Status */}
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{
                        background: healthData.status === "healthy" ? "#22c55e"
                          : healthData.status === "degraded" ? "#f59e0b" : "#ef4444",
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: "var(--a-text)" }}>
                        {healthData.status === "healthy" ? "Здоровий" : healthData.status === "degraded" ? "Проблеми" : "Не відповідає"}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--a-text-3)" }}>
                        Час відповіді: {healthData.responseTimeMs}ms
                      </p>
                    </div>
                  </div>

                  {/* Error if any */}
                  {healthData.error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-xs text-red-400">{healthData.error}</p>
                    </div>
                  )}

                  {/* Details */}
                  {Object.keys(healthData.details).length > 0 && (
                    <div className="p-3 rounded-lg" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
                      <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--a-text-4)" }}>Деталі</p>
                      <div className="text-[11px] font-mono" style={{ color: "var(--a-text-2)" }}>
                        <pre className="whitespace-pre-wrap break-all">{JSON.stringify(healthData.details, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  {/* Re-check button */}
                  <button
                    onClick={fetchHealth}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-2)" }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Перевірити зараз
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs" style={{ color: "var(--a-text-3)" }}>Немає даних. Натисніть щоб перевірити.</p>
                  <button
                    onClick={fetchHealth}
                    className="mt-3 flex items-center gap-2 mx-auto px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-2)" }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Перевірити зараз
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Events Tab ── */}
          {activeTab === "events" && (
            <div className="space-y-2">
              {eventsLoading ? (
                <div className="py-8 text-center">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto" style={{ color: "var(--a-text-4)" }} />
                </div>
              ) : recentEvents.length === 0 ? (
                <div className="py-8 text-center text-xs" style={{ color: "var(--a-text-3)" }}>
                  Подій для цього сервісу немає
                </div>
              ) : (
                recentEvents.map((ev: EventRow) => {
                  const time = ev.created_at || ev.received_at || "";
                  const statusColors: Record<string, string> = {
                    pending: "#9ca3af", processing: "#60a5fa", sent: "#4ade80",
                    processed: "#4ade80", received: "#60a5fa", failed: "#fbbf24", dead: "#f87171",
                  };
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg"
                      style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
                    >
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-medium flex-shrink-0"
                        style={{
                          background: (statusColors[ev.status] || "#9ca3af") + "20",
                          color: statusColors[ev.status] || "#9ca3af",
                        }}
                      >
                        {ev.status}
                      </span>
                      <span className="text-xs font-medium flex-1 truncate" style={{ color: "var(--a-text)" }}>
                        {ev.topic}
                      </span>
                      <span className="text-[10px] flex-shrink-0" style={{ color: "var(--a-text-4)" }}>
                        {time ? new Date(time).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
