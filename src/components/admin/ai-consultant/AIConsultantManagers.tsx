"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UsersRound,
  Plus,
  X,
  Loader2,
  Star,
  Clock,
  MessageCircle,
  Pencil,
  Wifi,
  WifiOff,
  AlertTriangle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Manager {
  id: string;
  telegram_id: number;
  name: string;
  telegram_username: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  is_online: boolean;
  max_chats: number;
  active_chats: number;
  total_chats: number;
  satisfaction_avg: number | null;
  avg_response_time_sec: number | null;
  work_hours_start: string | null;
  work_hours_end: string | null;
  work_days: number[] | null;
  specializations: string[] | null;
}

interface FormData {
  name: string;
  telegram_id: string;
  telegram_username: string;
  role: string;
  max_chats: number;
  work_hours_start: string;
  work_hours_end: string;
  work_days: number[];
  specializations: string[];
}

const EMPTY_FORM: FormData = {
  name: "",
  telegram_id: "",
  telegram_username: "",
  role: "manager",
  max_chats: 5,
  work_hours_start: "09:00",
  work_hours_end: "18:00",
  work_days: [1, 2, 3, 4, 5],
  specializations: [],
};

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const SPECIALIZATIONS = ["wholesale", "returns", "technical", "general", "vip"];
const SPEC_LABELS: Record<string, string> = {
  wholesale: "Оптові",
  returns: "Повернення",
  technical: "Технічні",
  general: "Загальні",
  vip: "VIP",
};
const ROLE_LABELS: Record<string, string> = {
  manager: "Менеджер",
  senior: "Старший",
  admin: "Адмін",
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const cardStyle: React.CSSProperties = {
  background: "var(--a-bg-card)",
  border: "1px solid var(--a-border)",
  borderRadius: 16,
  padding: 16,
  transition: "border-color 0.2s",
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

export function AIConsultantManagers() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  /* ── Load ────────────────────────────────────────── */

  const loadManagers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-consultant/managers");
      const json = await res.json();
      if (json.success) setManagers(json.data || []);
    } catch (err) {
      console.error("[Managers] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  /* ── Stats ───────────────────────────────────────── */

  const onlineCount = managers.filter((m) => m.is_online && m.is_active).length;
  const totalActive = managers.filter((m) => m.is_active).length;
  const totalActiveChats = managers.reduce((s, m) => s + (m.active_chats || 0), 0);
  const ratingsArr = managers.filter((m) => m.satisfaction_avg !== null).map((m) => m.satisfaction_avg!);
  const avgRating = ratingsArr.length > 0 ? ratingsArr.reduce((a, b) => a + b, 0) / ratingsArr.length : 0;

  /* ── Modal helpers ───────────────────────────────── */

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (mgr: Manager) => {
    setEditingId(mgr.id);
    setForm({
      name: mgr.name,
      telegram_id: String(mgr.telegram_id),
      telegram_username: mgr.telegram_username || "",
      role: mgr.role || "manager",
      max_chats: mgr.max_chats || 5,
      work_hours_start: mgr.work_hours_start || "09:00",
      work_hours_end: mgr.work_hours_end || "18:00",
      work_days: mgr.work_days || [1, 2, 3, 4, 5],
      specializations: mgr.specializations || [],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  /* ── CRUD ────────────────────────────────────────── */

  const handleSave = async () => {
    if (!form.name.trim() || !form.telegram_id.trim()) return;
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        telegram_id: Number(form.telegram_id),
        telegram_username: form.telegram_username.trim() || null,
        role: form.role,
        max_chats: form.max_chats,
        work_hours_start: form.work_hours_start,
        work_hours_end: form.work_hours_end,
        work_days: form.work_days,
        specializations: form.specializations,
      };

      if (editingId) {
        await fetch(`/api/admin/ai-consultant/managers/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/admin/ai-consultant/managers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      closeModal();
      await loadManagers();
    } catch (err) {
      console.error("[Managers] Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mgr: Manager) => {
    if (mgr.active_chats > 0) {
      alert(`Неможливо видалити: у ${mgr.name} є ${mgr.active_chats} активних чатів`);
      return;
    }
    if (!confirm(`Видалити менеджера ${mgr.name}?`)) return;

    try {
      await fetch(`/api/admin/ai-consultant/managers/${mgr.id}`, { method: "DELETE" });
      await loadManagers();
    } catch (err) {
      console.error("[Managers] Delete error:", err);
    }
  };

  const toggleActive = async (mgr: Manager) => {
    try {
      await fetch(`/api/admin/ai-consultant/managers/${mgr.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !mgr.is_active }),
      });
      await loadManagers();
    } catch (err) {
      console.error("[Managers] Toggle error:", err);
    }
  };

  /* ── Form updaters ───────────────────────────────── */

  const uf = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  const toggleDay = (d: number) =>
    setForm((p) => ({
      ...p,
      work_days: p.work_days.includes(d) ? p.work_days.filter((x) => x !== d) : [...p.work_days, d].sort(),
    }));

  const toggleSpec = (s: string) =>
    setForm((p) => ({
      ...p,
      specializations: p.specializations.includes(s)
        ? p.specializations.filter((x) => x !== s)
        : [...p.specializations, s],
    }));

  /* ── Format helpers ──────────────────────────────── */

  const fmtResponseTime = (sec: number | null) => {
    if (!sec) return "—";
    if (sec < 60) return `${sec} сек`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m} хв ${s} сек` : `${m} хв`;
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
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, var(--a-accent), #ec4899)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UsersRound className="w-6 h-6" style={{ color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--a-text)", margin: 0 }}>Менеджери чатів</h1>
            <p style={{ fontSize: 13, color: "var(--a-text-4)", margin: "2px 0 0" }}>Команда підтримки AI Консультанта</p>
          </div>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-2"
          style={{
            padding: "10px 22px", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 600,
            background: "linear-gradient(135deg, var(--a-accent), #ec4899)",
            color: "#fff", cursor: "pointer",
          }}
        >
          <Plus className="w-4 h-4" /> Додати менеджера
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ marginBottom: 20 }}>
        <StatCard
          label="Онлайн"
          value={`${onlineCount} / ${totalActive}`}
          color="#22c55e"
          icon={<Wifi className="w-4 h-4" />}
        />
        <StatCard
          label="Активних чатів"
          value={String(totalActiveChats)}
          color="var(--a-accent)"
          icon={<MessageCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Середній рейтинг"
          value={avgRating > 0 ? avgRating.toFixed(1) : "—"}
          color="#f59e0b"
          icon={<Star className="w-4 h-4" />}
        />
      </div>

      {/* Empty state */}
      {managers.length === 0 && (
        <div style={{
          ...cardStyle, textAlign: "center", padding: 48, color: "var(--a-text-4)",
        }}>
          <UsersRound className="w-10 h-10 mx-auto mb-3" style={{ opacity: 0.3 }} />
          <p style={{ fontSize: 14, marginBottom: 4 }}>Менеджерів ще немає</p>
          <p style={{ fontSize: 12 }}>Додайте першого менеджера для підтримки в чатах</p>
        </div>
      )}

      {/* Manager cards */}
      <div className="flex flex-col gap-3">
        {managers.map((mgr) => (
          <div
            key={mgr.id}
            style={{
              ...cardStyle,
              opacity: mgr.is_active ? 1 : 0.55,
              display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            }}
          >
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: mgr.is_online
                  ? "linear-gradient(135deg, #22c55e, #06b6d4)"
                  : "var(--a-bg-hover)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 700,
                color: mgr.is_online ? "#fff" : "var(--a-text-4)",
              }}>
                {mgr.name.charAt(0).toUpperCase()}
              </div>
              <div style={{
                position: "absolute", bottom: -1, right: -1,
                width: 12, height: 12, borderRadius: "50%",
                background: mgr.is_online ? "#22c55e" : "#71717a",
                border: "2px solid var(--a-bg-card)",
              }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--a-text)" }}>{mgr.name}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                  background: mgr.role === "admin" ? "#ef444420" : mgr.role === "senior" ? "#f59e0b20" : "var(--a-accent-bg)",
                  color: mgr.role === "admin" ? "#ef4444" : mgr.role === "senior" ? "#f59e0b" : "var(--a-accent)",
                }}>
                  {ROLE_LABELS[mgr.role] || mgr.role}
                </span>
                {!mgr.is_active && (
                  <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 6, background: "#71717a20", color: "#71717a" }}>
                    Неактивний
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 4, fontSize: 12, color: "var(--a-text-4)" }}>
                {mgr.telegram_username && (
                  <span>@{mgr.telegram_username}</span>
                )}
                {mgr.work_hours_start && mgr.work_hours_end && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {mgr.work_hours_start}–{mgr.work_hours_end}
                  </span>
                )}
              </div>

              {/* Specializations */}
              {mgr.specializations && mgr.specializations.length > 0 && (
                <div className="flex flex-wrap gap-1" style={{ marginTop: 6 }}>
                  {mgr.specializations.map((s) => (
                    <span key={s} style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 6,
                      background: "var(--a-accent-bg)", color: "var(--a-accent)",
                    }}>
                      {SPEC_LABELS[s] || s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-4 flex-shrink-0" style={{ fontSize: 12 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontWeight: mgr.active_chats > 0 ? 700 : 400,
                  color: mgr.active_chats > 0 ? "var(--a-accent)" : "var(--a-text-4)",
                  fontSize: 13,
                }}>
                  {mgr.active_chats}/{mgr.max_chats}
                </div>
                <div style={{ color: "var(--a-text-5)", fontSize: 10 }}>чатів</div>
              </div>

              <div style={{ textAlign: "center" }}>
                <div className="flex items-center gap-0.5 justify-center" style={{ color: "#f59e0b", fontSize: 13 }}>
                  <Star className="w-3 h-3" style={{ fill: "#f59e0b" }} />
                  {mgr.satisfaction_avg?.toFixed(1) || "—"}
                </div>
                <div style={{ color: "var(--a-text-5)", fontSize: 10 }}>рейтинг</div>
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ color: "var(--a-text-3)", fontSize: 13 }}>
                  {fmtResponseTime(mgr.avg_response_time_sec)}
                </div>
                <div style={{ color: "var(--a-text-5)", fontSize: 10 }}>відповідь</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => openEdit(mgr)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: 8, color: "var(--a-text-4)" }}
                title="Редагувати"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => toggleActive(mgr)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: 8, color: mgr.is_active ? "#22c55e" : "#71717a" }}
                title={mgr.is_active ? "Деактивувати" : "Активувати"}
              >
                {mgr.is_active ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleDelete(mgr)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: 8, color: "var(--a-text-5)" }}
                title="Видалити"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div style={{
            background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
            borderRadius: 20, width: "100%", maxWidth: 520,
            maxHeight: "85vh", overflowY: "auto", padding: 24,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--a-text)", margin: 0 }}>
                {editingId ? "Редагувати менеджера" : "Додати менеджера"}
              </h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--a-text-4)", padding: 4 }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Name */}
              <div>
                <label style={labelStyle}>Ім'я *</label>
                <input type="text" value={form.name} onChange={(e) => uf("name", e.target.value)} style={inputStyle} placeholder="Олена Менеджер" />
              </div>

              {/* Telegram ID */}
              <div>
                <label style={labelStyle}>Telegram ID *</label>
                <input type="number" value={form.telegram_id} onChange={(e) => uf("telegram_id", e.target.value)} style={inputStyle} placeholder="123456789" />
                <p style={{ fontSize: 11, color: "var(--a-text-5)", marginTop: 4 }}>
                  Отримайте через @userinfobot в Telegram
                </p>
              </div>

              {/* Telegram username */}
              <div>
                <label style={labelStyle}>Telegram username</label>
                <input type="text" value={form.telegram_username} onChange={(e) => uf("telegram_username", e.target.value)} style={inputStyle} placeholder="@username" />
              </div>

              {/* Role */}
              <div>
                <label style={labelStyle}>Роль</label>
                <select value={form.role} onChange={(e) => uf("role", e.target.value)} style={inputStyle}>
                  <option value="manager">Менеджер</option>
                  <option value="senior">Старший менеджер</option>
                  <option value="admin">Адміністратор</option>
                </select>
              </div>

              {/* Max chats */}
              <div>
                <label style={labelStyle}>Макс чатів одночасно</label>
                <input type="number" value={form.max_chats} onChange={(e) => uf("max_chats", +e.target.value)} style={inputStyle} min={1} max={20} />
              </div>

              {/* Work hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Початок роботи</label>
                  <input type="time" value={form.work_hours_start} onChange={(e) => uf("work_hours_start", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Кінець роботи</label>
                  <input type="time" value={form.work_hours_end} onChange={(e) => uf("work_hours_end", e.target.value)} style={inputStyle} />
                </div>
              </div>

              {/* Work days */}
              <div>
                <label style={labelStyle}>Робочі дні</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAY_LABELS.map((lbl, i) => {
                    const day = i + 1;
                    const active = form.work_days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        style={{
                          width: 40, height: 34, borderRadius: 10, border: "none",
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                          background: active ? "var(--a-accent)" : "var(--a-bg-hover)",
                          color: active ? "#fff" : "var(--a-text-4)",
                          transition: "all 0.15s",
                        }}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specializations */}
              <div>
                <label style={labelStyle}>Спеціалізації</label>
                <div className="flex gap-1.5 flex-wrap">
                  {SPECIALIZATIONS.map((s) => {
                    const active = form.specializations.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSpec(s)}
                        style={{
                          padding: "6px 14px", borderRadius: 10, border: "none",
                          fontSize: 12, fontWeight: 500, cursor: "pointer",
                          background: active ? "var(--a-accent)" : "var(--a-bg-hover)",
                          color: active ? "#fff" : "var(--a-text-4)",
                          transition: "all 0.15s",
                        }}
                      >
                        {SPEC_LABELS[s]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3" style={{ marginTop: 24 }}>
              <button
                onClick={closeModal}
                style={{
                  padding: "10px 20px", borderRadius: 12, border: "1px solid var(--a-border)",
                  background: "transparent", color: "var(--a-text-3)", fontSize: 13,
                  fontWeight: 500, cursor: "pointer",
                }}
              >
                Скасувати
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || !form.telegram_id.trim() || saving}
                className="flex items-center gap-2"
                style={{
                  padding: "10px 22px", borderRadius: 12, border: "none",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: form.name.trim() && form.telegram_id.trim() && !saving
                    ? "linear-gradient(135deg, var(--a-accent), #ec4899)"
                    : "var(--a-bg-hover)",
                  color: form.name.trim() && form.telegram_id.trim() ? "#fff" : "var(--a-text-4)",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Зберегти" : "Створити"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div style={{
      background: `${color}10`,
      border: `1px solid ${color}20`,
      borderRadius: 14,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
        <div style={{ fontSize: 11, color: "var(--a-text-4)" }}>{label}</div>
      </div>
    </div>
  );
}
