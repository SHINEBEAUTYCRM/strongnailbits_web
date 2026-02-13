"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Truck, CheckCircle, XCircle, Clock, Package,
  ChevronDown, Save,
} from "lucide-react";

const STATUSES = [
  { value: "new", label: "Нове", color: "#60a5fa", bg: "#172554", icon: Clock },
  { value: "processing", label: "В обробці", color: "#fbbf24", bg: "#422006", icon: Package },
  { value: "shipped", label: "Відправлено", color: "#a78bfa", bg: "#2e1065", icon: Truck },
  { value: "delivered", label: "Доставлено", color: "#4ade80", bg: "#052e16", icon: CheckCircle },
  { value: "cancelled", label: "Скасовано", color: "#f87171", bg: "#450a0a", icon: XCircle },
];

const PAYMENT_STATUSES = [
  { value: "pending", label: "Очікує", color: "#fbbf24", bg: "#422006" },
  { value: "paid", label: "Оплачено", color: "#4ade80", bg: "#052e16" },
  { value: "failed", label: "Помилка", color: "#f87171", bg: "#450a0a" },
];

interface Props {
  orderId: string;
  currentStatus: string;
  currentPaymentStatus: string;
  currentTtn: string;
  currentNotes: string;
  currentShippingCost: string;
  currentDiscount: string;
}

export function OrderActions({
  orderId, currentStatus, currentPaymentStatus, currentTtn, currentNotes,
  currentShippingCost, currentDiscount,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [paymentStatus, setPaymentStatus] = useState(currentPaymentStatus);
  const [ttn, setTtn] = useState(currentTtn);
  const [notes, setNotes] = useState(currentNotes);
  const [shippingCost, setShippingCost] = useState(currentShippingCost);
  const [discount, setDiscount] = useState(currentDiscount);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasChanges =
    status !== currentStatus ||
    paymentStatus !== currentPaymentStatus ||
    ttn !== currentTtn ||
    notes !== currentNotes ||
    shippingCost !== currentShippingCost ||
    discount !== currentDiscount;

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orderId, status, payment_status: paymentStatus,
          ttn, notes, shipping_cost: shippingCost, discount,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error || "Помилка"); setSaving(false); return; }
      setSuccess("Збережено");
      setTimeout(() => setSuccess(""), 3000);
      router.refresh();
    } catch { setError("Помилка мережі"); }
    setSaving(false);
  };

  const quickStatus = async (newStatus: string) => {
    setStatus(newStatus);
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error || "Помилка"); setStatus(currentStatus); }
      else { setSuccess("Статус оновлено"); setTimeout(() => setSuccess(""), 3000); router.refresh(); }
    } catch { setError("Помилка мережі"); setStatus(currentStatus); }
    setSaving(false);
  };

  const currentIdx = STATUSES.findIndex((s) => s.value === status);
  const nextStatus = currentIdx < STATUSES.length - 2 ? STATUSES[currentIdx + 1] : null; // Skip cancelled

  return (
    <div className="space-y-4">
      {error && <div className="px-4 py-2.5 rounded-lg text-sm" style={{ color: "#f87171", background: "#450a0a", border: "1px solid #7f1d1d" }}>{error}</div>}
      {success && <div className="px-4 py-2.5 rounded-lg text-sm" style={{ color: "#4ade80", background: "#052e16", border: "1px solid #166534" }}>{success}</div>}

      {/* Quick status progression */}
      <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
        <h3 className="text-sm font-medium mb-4" style={{ color: "var(--a-text-2)" }}>Статус замовлення</h3>

        {/* Status pipeline */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
          {STATUSES.filter((s) => s.value !== "cancelled").map((s, i) => {
            const Icon = s.icon;
            const isActive = s.value === status;
            const isPast = STATUSES.findIndex((x) => x.value === status) > i;
            return (
              <button key={s.value} onClick={() => quickStatus(s.value)} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0"
                style={isActive
                  ? { color: s.color, background: s.bg, border: `1px solid ${s.color}40` }
                  : isPast
                    ? { color: s.color, background: "transparent", border: "1px solid var(--a-border)", opacity: 0.6 }
                    : { color: "var(--a-text-4)", background: "transparent", border: "1px solid var(--a-border)" }}>
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
          <div className="w-px h-6 shrink-0" style={{ background: "var(--a-border)" }} />
          <button onClick={() => quickStatus("cancelled")} disabled={saving || status === "cancelled"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0"
            style={status === "cancelled" ? { color: "#f87171", background: "#450a0a", border: "1px solid #7f1d1d" } : { color: "var(--a-text-4)", background: "transparent", border: "1px solid var(--a-border)" }}>
            <XCircle className="w-3.5 h-3.5" /> Скасувати
          </button>
        </div>

        {/* Next status shortcut */}
        {nextStatus && status !== "cancelled" && (() => {
          const NextIcon = nextStatus.icon;
          return (
            <button onClick={() => quickStatus(nextStatus.value)} disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ color: nextStatus.color, background: nextStatus.bg, border: `1px solid ${nextStatus.color}30` }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <NextIcon className="w-4 h-4" />}
              Перевести в &quot;{nextStatus.label}&quot;
            </button>
          );
        })()}
      </div>

      {/* TTN */}
      <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--a-text-2)" }}>ТТН Нова Пошта</h3>
        <input type="text" value={ttn} onChange={(e) => setTtn(e.target.value)} placeholder="20450000000000"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none font-mono transition-colors"
          style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)", color: "var(--a-text-body)", letterSpacing: "0.5px" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--a-accent-btn)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--a-border)"; }} />
        {ttn && (
          <a href={`https://novaposhta.ua/tracking/?cargo_number=${ttn}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-xs" style={{ color: "var(--a-accent)" }}>
            <Truck className="w-3.5 h-3.5" /> Відстежити на Новій Пошті →
          </a>
        )}
      </div>

      {/* Payment */}
      <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--a-text-2)" }}>Оплата</h3>
        <div className="flex gap-2">
          {PAYMENT_STATUSES.map((ps) => (
            <button key={ps.value} onClick={() => setPaymentStatus(ps.value)}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all text-center"
              style={paymentStatus === ps.value ? { color: ps.color, background: ps.bg, border: `1px solid ${ps.color}40` } : { color: "var(--a-text-4)", background: "transparent", border: "1px solid var(--a-border)" }}>
              {ps.label}
            </button>
          ))}
        </div>
      </div>

      {/* Financials */}
      <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--a-text-2)" }}>Фінанси</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>Доставка (₴)</label>
            <input type="number" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono transition-colors"
              style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--a-accent-btn)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--a-border)"; }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>Знижка (₴)</label>
            <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono transition-colors"
              style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--a-accent-btn)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--a-border)"; }} />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--a-text-2)" }}>Примітки</h3>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Внутрішні нотатки до замовлення..."
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-y transition-colors"
          style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--a-accent-btn)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--a-border)"; }} />
      </div>

      {/* Save button */}
      {hasChanges && (
        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
          style={{ background: "#7c3aed" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Зберегти зміни
        </button>
      )}
    </div>
  );
}
