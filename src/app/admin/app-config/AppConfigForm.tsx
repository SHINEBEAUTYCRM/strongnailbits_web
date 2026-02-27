"use client";
import { useState } from "react";
import { Save, Check } from "lucide-react";

interface Config {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

const EDITABLE: Record<string, { label: string; type: "text" | "number" | "json" | "boolean" }> = {
  free_shipping_threshold: { label: "Поріг безкоштовної доставки (грн)", type: "number" },
  min_order_amount: { label: "Мінімальна сума замовлення (грн)", type: "number" },
  phone: { label: "Контактний телефон", type: "text" },
  email: { label: "Контактний email", type: "text" },
  instagram: { label: "Instagram URL", type: "text" },
  telegram_channel: { label: "Telegram URL", type: "text" },
  working_hours: { label: "Графік роботи", type: "json" },
  address: { label: "Фізична адреса", type: "text" },
  maintenance_mode: { label: "Режим обслуговування", type: "boolean" },
  feature_flags: { label: "Feature flags", type: "json" },
  loyalty_tiers: { label: "Пороги лояльності (грн)", type: "json" },
  min_app_version_ios: { label: "Мін. версія iOS", type: "text" },
  min_app_version_android: { label: "Мін. версія Android", type: "text" },
  shipping_methods: { label: "Способи доставки", type: "json" },
  payment_methods: { label: "Способи оплати", type: "json" },
};

export function AppConfigForm({ configs }: { configs: Config[] }) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    configs.forEach((c) => {
      init[c.key] = typeof c.value === "string" ? c.value : JSON.stringify(c.value, null, 2);
    });
    return init;
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      const meta = EDITABLE[key];
      let value: unknown = values[key];
      if (meta?.type === "number") value = Number(value);
      else if (meta?.type === "boolean") value = value === "true";
      else if (meta?.type === "json") value = JSON.parse(value as string);

      const res = await fetch("/api/admin/app-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        setSaved(key);
        setTimeout(() => setSaved(null), 2000);
      }
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      {configs
        .filter((c) => EDITABLE[c.key])
        .map((c) => {
          const meta = EDITABLE[c.key];
          return (
            <div key={c.id} className="rounded-2xl p-5"
                 style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "var(--a-card-shadow)" }}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: "var(--a-text)" }}>
                  {meta.label}
                </label>
                <button onClick={() => handleSave(c.key)}
                        disabled={saving === c.key}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{ background: saved === c.key ? "#16a34a20" : "var(--a-accent-bg)", color: saved === c.key ? "#16a34a" : "var(--a-accent)" }}>
                  {saved === c.key ? <><Check className="w-3.5 h-3.5" /> Збережено</> : <><Save className="w-3.5 h-3.5" /> Зберегти</>}
                </button>
              </div>
              {meta.type === "json" ? (
                <textarea
                  value={values[c.key] || ""}
                  onChange={(e) => setValues({ ...values, [c.key]: e.target.value })}
                  rows={5}
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono"
                  style={{ background: "var(--a-bg-input)", color: "var(--a-text)", border: "1px solid var(--a-border)" }}
                />
              ) : meta.type === "boolean" ? (
                <select
                  value={values[c.key] || "false"}
                  onChange={(e) => setValues({ ...values, [c.key]: e.target.value })}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ background: "var(--a-bg-input)", color: "var(--a-text)", border: "1px solid var(--a-border)" }}>
                  <option value="false">Вимкнено</option>
                  <option value="true">Увімкнено</option>
                </select>
              ) : (
                <input
                  type={meta.type === "number" ? "number" : "text"}
                  value={values[c.key] || ""}
                  onChange={(e) => setValues({ ...values, [c.key]: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: "var(--a-bg-input)", color: "var(--a-text)", border: "1px solid var(--a-border)" }}
                />
              )}
              {c.description && (
                <p className="mt-1.5 text-xs" style={{ color: "var(--a-text-5)" }}>{c.description}</p>
              )}
            </div>
          );
        })}
    </div>
  );
}
