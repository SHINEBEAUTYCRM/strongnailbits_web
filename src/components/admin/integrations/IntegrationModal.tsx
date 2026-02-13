"use client";

// ================================================================
//  IntegrationModal — Модальне вікно налаштування інтеграції
// ================================================================

import { useState, useEffect, useCallback } from "react";
import { X, ExternalLink, Check, AlertCircle, Loader2 } from "lucide-react";
import type { ServiceDefinition, IntegrationStatusItem } from "@/lib/integrations/types";
import { IntegrationStatus } from "./IntegrationStatus";
import { IntegrationLogs } from "./IntegrationLogs";

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
  const [activeTab, setActiveTab] = useState<"config" | "logs">("config");

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
    }
  }, [isOpen, service]);

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
    } catch {
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
    } catch {
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
    } catch {
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
        {hasFields && (
          <div className="flex border-b border-[var(--a-border)]">
            <button
              onClick={() => setActiveTab("config")}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === "config"
                  ? "text-purple-400 border-b-2 border-purple-500"
                  : "text-[var(--a-text-3)] hover:text-[var(--a-text-2)]"
              }`}
            >
              Налаштування
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === "logs"
                  ? "text-purple-400 border-b-2 border-purple-500"
                  : "text-[var(--a-text-3)] hover:text-[var(--a-text-2)]"
              }`}
            >
              Логи
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {activeTab === "config" ? (
            <div className="space-y-4">
              {hasFields ? (
                <>
                  {/* Fields */}
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

                  {/* Verify Result */}
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

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleVerify}
                      disabled={verifying || saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                    >
                      {verifying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
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

                  {/* Deactivate */}
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
          ) : (
            <IntegrationLogs slug={service.slug} />
          )}
        </div>
      </div>
    </div>
  );
}
