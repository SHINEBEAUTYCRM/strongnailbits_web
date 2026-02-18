"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Palette,
  Save,
  Loader2,
  Plus,
  X,
  Send,
  Sparkles,
  MessageCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WidgetDesign {
  position: string;
  offset_x: number;
  offset_y: number;
  width: number;
  height: number;
  mobile_fullscreen: boolean;
  button_size: number;
  button_icon: string;
  button_icon_open: string;
  primary_color: string;
  secondary_color: string;
  bg_color: string;
  text_color: string;
  manager_color: string;
  welcome_title: string;
  welcome_subtitle: string;
  welcome_icon: string;
  input_placeholder_ai: string;
  input_placeholder_manager: string;
  offline_title: string;
  offline_subtitle: string;
  offline_show_form: boolean;
  show_powered_by: boolean;
  powered_by_text: string;
  show_unread_badge: boolean;
  show_pulse_animation: boolean;
  auto_open_delay_seconds: number;
}

interface QuickButton {
  label: string;
  message: string;
  icon: string;
}

const DEFAULT_DESIGN: WidgetDesign = {
  position: "bottom-right",
  offset_x: 20,
  offset_y: 20,
  width: 380,
  height: 560,
  mobile_fullscreen: true,
  button_size: 56,
  button_icon: "💬",
  button_icon_open: "✕",
  primary_color: "#a855f7",
  secondary_color: "#ec4899",
  bg_color: "#1a1a2e",
  text_color: "#e4e4e7",
  manager_color: "#3b82f6",
  welcome_title: "Привіт! Чим допомогти?",
  welcome_subtitle: "AI-консультант Shine Shop відповість миттєво",
  welcome_icon: "✨",
  input_placeholder_ai: "Напишіть питання...",
  input_placeholder_manager: "Повідомлення менеджеру...",
  offline_title: "Ми зараз офлайн",
  offline_subtitle: "Залиште повідомлення і ми відповімо",
  offline_show_form: true,
  show_powered_by: true,
  powered_by_text: "Shine Shop AI",
  show_unread_badge: true,
  show_pulse_animation: true,
  auto_open_delay_seconds: 0,
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const cardStyle: React.CSSProperties = {
  background: "var(--a-bg-card)",
  border: "1px solid var(--a-border)",
  borderRadius: 16,
  padding: 20,
  marginBottom: 16,
};

const inputStyle: React.CSSProperties = {
  background: "var(--a-bg-input)",
  border: "1px solid var(--a-border)",
  borderRadius: 12,
  padding: "9px 12px",
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

export function AIConsultantWidget() {
  const [design, setDesign] = useState<WidgetDesign>(DEFAULT_DESIGN);
  const [quickButtons, setQuickButtons] = useState<QuickButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  /* ── Load ────────────────────────────────────────── */

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/ai-consultant/widget");
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.design) setDesign({ ...DEFAULT_DESIGN, ...json.data.design });
          if (json.data.quickButtons) {
            setQuickButtons(
              json.data.quickButtons.map((b: Record<string, string>) => ({
                label: b.label || "",
                message: b.message || "",
                icon: b.icon || "",
              })),
            );
          }
        }
      } catch (err) {
        console.error("[Widget] Load failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Update helpers ──────────────────────────────── */

  const ud = useCallback(<K extends keyof WidgetDesign>(key: K, value: WidgetDesign[K]) => {
    setDesign((p) => ({ ...p, [key]: value }));
    setDirty(true);
    setSaved(false);
  }, []);

  const markDirty = useCallback(() => {
    setDirty(true);
    setSaved(false);
  }, []);

  /* ── Save ────────────────────────────────────────── */

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ai-consultant/widget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design, quickButtons }),
      });
      const json = await res.json();
      if (json.success) {
        setDirty(false);
        setSaved(true);
        if (json.data?.design) setDesign({ ...DEFAULT_DESIGN, ...json.data.design });
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("[Widget] Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  /* ── Quick buttons CRUD ──────────────────────────── */

  const addQuickButton = () => {
    setQuickButtons((p) => [...p, { label: "", message: "", icon: "" }]);
    markDirty();
  };

  const updateQB = (i: number, field: keyof QuickButton, value: string) => {
    setQuickButtons((p) => p.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));
    markDirty();
  };

  const removeQB = (i: number) => {
    setQuickButtons((p) => p.filter((_, idx) => idx !== i));
    markDirty();
  };

  /* ── Loading ─────────────────────────────────────── */

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, color: "var(--a-text-4)" }}>
        <Loader2 className="w-6 h-6 animate-spin" />
        <span style={{ marginLeft: 10 }}>Завантаження...</span>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────── */

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, var(--a-accent), #ec4899)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Palette className="w-6 h-6" style={{ color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--a-text)", margin: 0 }}>Дизайн віджета</h1>
            <p style={{ fontSize: 13, color: "var(--a-text-4)", margin: "2px 0 0" }}>Зовнішній вигляд і поведінка чат-віджета</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="flex items-center gap-2"
          style={{
            padding: "10px 22px", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 600,
            background: dirty && !saving ? "linear-gradient(135deg, var(--a-accent), #ec4899)" : saved ? "#22c55e" : "var(--a-bg-hover)",
            color: dirty || saved ? "#fff" : "var(--a-text-4)",
            cursor: dirty && !saving ? "pointer" : "default",
            opacity: !dirty && !saved ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Зберігаю..." : saved ? "Збережено!" : "Зберегти"}
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        {/* Left: settings */}
        <div>
          {/* Chat Button */}
          <SectionCard title="Кнопка чату" icon={<MessageCircle className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Позиція">
                <select value={design.position} onChange={(e) => ud("position", e.target.value)} style={inputStyle}>
                  <option value="bottom-right">Справа знизу</option>
                  <option value="bottom-left">Зліва знизу</option>
                </select>
              </Field>
              <Field label="Розмір кнопки (px)">
                <input type="number" value={design.button_size} onChange={(e) => ud("button_size", +e.target.value)} style={inputStyle} min={40} max={80} />
              </Field>
              <Field label="Іконка кнопки">
                <input type="text" value={design.button_icon} onChange={(e) => ud("button_icon", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Іконка закриття">
                <input type="text" value={design.button_icon_open} onChange={(e) => ud("button_icon_open", e.target.value)} style={inputStyle} />
              </Field>
            </div>
          </SectionCard>

          {/* Colors */}
          <SectionCard title="Кольори" icon={<Palette className="w-4 h-4" />}>
            <div className="flex flex-col gap-3">
              <ColorInput label="Основний" value={design.primary_color} onChange={(v) => ud("primary_color", v)} />
              <ColorInput label="Акцент" value={design.secondary_color} onChange={(v) => ud("secondary_color", v)} />
              <ColorInput label="Фон" value={design.bg_color} onChange={(v) => ud("bg_color", v)} />
              <ColorInput label="Текст" value={design.text_color} onChange={(v) => ud("text_color", v)} />
              <ColorInput label="Менеджер" value={design.manager_color} onChange={(v) => ud("manager_color", v)} />
            </div>
          </SectionCard>

          {/* Welcome Screen */}
          <SectionCard title="Вітальний екран" icon={<Sparkles className="w-4 h-4" />}>
            <div className="flex flex-col gap-3">
              <Field label="Іконка">
                <input type="text" value={design.welcome_icon} onChange={(e) => ud("welcome_icon", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Заголовок">
                <input type="text" value={design.welcome_title} onChange={(e) => ud("welcome_title", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Підзаголовок">
                <input type="text" value={design.welcome_subtitle} onChange={(e) => ud("welcome_subtitle", e.target.value)} style={inputStyle} />
              </Field>
            </div>
          </SectionCard>

          {/* Quick Buttons */}
          <SectionCard title="Quick Buttons" icon={<Send className="w-4 h-4" />}>
            <div className="flex flex-col gap-2">
              {quickButtons.map((btn, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={btn.label}
                    onChange={(e) => updateQB(i, "label", e.target.value)}
                    placeholder="Кнопка"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="text"
                    value={btn.message}
                    onChange={(e) => updateQB(i, "message", e.target.value)}
                    placeholder="Повідомлення"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => removeQB(i)}
                    style={{ color: "var(--a-text-4)", background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={addQuickButton}
                className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl transition-colors"
                style={{ border: "1px dashed var(--a-border)", background: "transparent", color: "var(--a-text-3)", cursor: "pointer" }}
              >
                <Plus className="w-3.5 h-3.5" /> Додати кнопку
              </button>
            </div>
          </SectionCard>

          {/* Placeholders */}
          <SectionCard title="Плейсхолдери" icon={<MessageCircle className="w-4 h-4" />}>
            <div className="flex flex-col gap-3">
              <Field label="Плейсхолдер AI">
                <input type="text" value={design.input_placeholder_ai} onChange={(e) => ud("input_placeholder_ai", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Плейсхолдер менеджер">
                <input type="text" value={design.input_placeholder_manager} onChange={(e) => ud("input_placeholder_manager", e.target.value)} style={inputStyle} />
              </Field>
            </div>
          </SectionCard>

          {/* Offline */}
          <SectionCard title="Офлайн режим" icon={<MessageCircle className="w-4 h-4" />}>
            <div className="flex flex-col gap-3">
              <Field label="Заголовок офлайн">
                <input type="text" value={design.offline_title} onChange={(e) => ud("offline_title", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Підзаголовок офлайн">
                <input type="text" value={design.offline_subtitle} onChange={(e) => ud("offline_subtitle", e.target.value)} style={inputStyle} />
              </Field>
              <ToggleRow label="Показувати форму зворотного зв'язку" checked={design.offline_show_form} onChange={(v) => ud("offline_show_form", v)} />
            </div>
          </SectionCard>

          {/* Other */}
          <SectionCard title="Інше" icon={<Sparkles className="w-4 h-4" />}>
            <div className="flex flex-col gap-3">
              <ToggleRow label="Показувати «Powered by»" checked={design.show_powered_by} onChange={(v) => ud("show_powered_by", v)} />
              {design.show_powered_by && (
                <Field label="Текст powered by">
                  <input type="text" value={design.powered_by_text} onChange={(e) => ud("powered_by_text", e.target.value)} style={inputStyle} />
                </Field>
              )}
              <ToggleRow label="Badge непрочитаних" checked={design.show_unread_badge} onChange={(v) => ud("show_unread_badge", v)} />
              <ToggleRow label="Пульсуюча анімація кнопки" checked={design.show_pulse_animation} onChange={(v) => ud("show_pulse_animation", v)} />
              <Field label="Авто-відкриття (сек, 0 = вимкнено)">
                <input type="number" value={design.auto_open_delay_seconds} onChange={(e) => ud("auto_open_delay_seconds", +e.target.value)} style={inputStyle} min={0} max={120} />
              </Field>
            </div>
          </SectionCard>
        </div>

        {/* Right: live preview */}
        <div style={{ position: "sticky", top: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--a-text-3)", marginBottom: 10, textAlign: "center" }}>Live Preview</div>
          <WidgetPreview design={design} quickButtons={quickButtons} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ color: "var(--a-accent)" }}>{icon}</span>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--a-text)", margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ ...labelStyle, width: 80, flexShrink: 0, marginBottom: 0 }}>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer", padding: 0, background: "transparent" }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, width: 100, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
      />
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
      <span style={{ fontSize: 13, color: "var(--a-text-2)" }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 38, height: 20, borderRadius: 10,
          border: "none", cursor: "pointer", position: "relative",
          background: checked ? "var(--a-accent)" : "var(--a-bg-hover)",
          transition: "background 0.2s", flexShrink: 0,
        }}
      >
        <div style={{
          width: 16, height: 16, borderRadius: "50%",
          background: "#fff", position: "absolute", top: 2,
          left: checked ? 20 : 2,
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Live Preview                                                       */
/* ------------------------------------------------------------------ */

function WidgetPreview({ design, quickButtons }: { design: WidgetDesign; quickButtons: QuickButton[] }) {
  const d = design;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Chat Panel */}
      <div
        style={{
          width: 290,
          borderRadius: 16,
          overflow: "hidden",
          background: d.bg_color,
          border: "1px solid var(--a-border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: `linear-gradient(135deg, ${d.primary_color}18, ${d.secondary_color}18)`,
            borderBottom: `1px solid ${d.primary_color}20`,
          }}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: `linear-gradient(135deg, ${d.primary_color}, ${d.secondary_color})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, color: "#fff",
            }}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: d.text_color }}>AI Консультант</div>
            <div style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              <span style={{ color: `${d.text_color}80` }}>Онлайн</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{d.welcome_icon}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: d.text_color, marginBottom: 4 }}>
            {d.welcome_title}
          </div>
          <div style={{ fontSize: 11, color: `${d.text_color}80`, lineHeight: 1.5 }}>
            {d.welcome_subtitle}
          </div>

          {/* Quick buttons */}
          {quickButtons.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 14 }}>
              {quickButtons.filter((b) => b.label).map((btn, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 10, fontWeight: 500,
                    padding: "5px 12px", borderRadius: 20,
                    border: `1px solid ${d.primary_color}40`,
                    color: d.primary_color,
                    background: `${d.primary_color}10`,
                    cursor: "default",
                  }}
                >
                  {btn.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: "10px 12px", borderTop: `1px solid ${d.primary_color}15` }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: `${d.text_color}08`, borderRadius: 12,
              padding: "9px 12px",
            }}
          >
            <span style={{ fontSize: 11, color: `${d.text_color}40`, flex: 1 }}>
              {d.input_placeholder_ai}
            </span>
            <Send className="w-3.5 h-3.5" style={{ color: d.primary_color, opacity: 0.5 }} />
          </div>

          {/* Powered by */}
          {d.show_powered_by && (
            <div style={{ textAlign: "center", marginTop: 6, fontSize: 9, color: `${d.text_color}30` }}>
              Powered by {d.powered_by_text}
            </div>
          )}
        </div>
      </div>

      {/* Chat Button */}
      <div className="flex flex-col items-center gap-2">
        <div
          style={{
            width: d.button_size,
            height: d.button_size,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${d.primary_color}, ${d.secondary_color})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: d.button_size * 0.4,
            color: "#fff",
            boxShadow: `0 4px 20px ${d.primary_color}66`,
            cursor: "default",
            position: "relative",
          }}
        >
          {d.button_icon}

          {/* Unread badge */}
          {d.show_unread_badge && (
            <div
              style={{
                position: "absolute", top: -2, right: -2,
                width: 18, height: 18, borderRadius: "50%",
                background: "#ef4444", color: "#fff",
                fontSize: 10, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `2px solid ${d.bg_color}`,
              }}
            >
              1
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, color: "var(--a-text-5)" }}>Кнопка чату</span>
      </div>
    </div>
  );
}
