"use client";

import { useState } from "react";
import { UserPlus, Eye, EyeOff, AlertCircle, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DangrowBadge } from "@/components/admin/DangrowBadge";

export default function AdminRegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !firstName) {
      setError("Заповніть обов'язкові поля");
      return;
    }
    if (password.length < 6) {
      setError("Пароль мінімум 6 символів");
      return;
    }
    setLoading(true); setError("");

    try {
      const res = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Помилка реєстрації");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Помилка мережі");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "#08080c" }}>
        <div className="w-full max-w-[400px] mx-4 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#052e16", border: "1px solid #166534" }}>
            <CheckCircle className="w-8 h-8" style={{ color: "#4ade80" }} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "#f4f4f5" }}>Запит надіслано</h2>
          <p className="text-sm mb-1" style={{ color: "#a1a1aa" }}>Ваш акаунт створено і очікує підтвердження.</p>
          <p className="text-sm mb-6" style={{ color: "#52525b" }}>Адміністратор отримає повідомлення і надасть вам доступ.</p>
          <Link href="/admin/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#7c3aed" }}>
            <ArrowLeft className="w-4 h-4" /> Повернутись до входу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "#08080c" }}>
      <div className="w-full max-w-[400px] mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-wider mb-1">
            <span style={{ color: "#a855f7" }}>ShineShop</span>{" "}
            <span style={{ color: "#52525b", fontSize: "14px", letterSpacing: "0.15em" }}>OPERATING SYSTEM</span>
          </h1>
          <p className="text-sm" style={{ color: "#52525b" }}>Запросити доступ до панелі управління</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl p-6" style={{ background: "#0c0c12", border: "1px solid #1e1e2a" }}>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4 text-sm" style={{ background: "#1c1017", border: "1px solid #7f1d1d", color: "#ef4444" }}>
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#71717a" }}>Ім&apos;я *</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Олексій"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{ background: "#111116", border: "1px solid #1e1e2a", color: "#e4e4e7" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#1e1e2a"; }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#71717a" }}>Прізвище</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Іваненко"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{ background: "#111116", border: "1px solid #1e1e2a", color: "#e4e4e7" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#1e1e2a"; }} />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#71717a" }}>Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{ background: "#111116", border: "1px solid #1e1e2a", color: "#e4e4e7" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#1e1e2a"; }} />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#71717a" }}>Пароль *</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Мінімум 6 символів"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none pr-10 transition-colors"
                style={{ background: "#111116", border: "1px solid #1e1e2a", color: "#e4e4e7" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#1e1e2a"; }} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#52525b" }}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "#7c3aed" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Запросити доступ
          </button>

          <p className="text-[10px] text-center mt-3" style={{ color: "#3f3f46" }}>
            Після реєстрації ваш акаунт буде на перевірці.<br />
            Адміністратор підтвердить або відхилить запит.
          </p>
        </form>

        <div className="text-center mt-4">
          <Link href="/admin/login" className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#52525b" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Вже є акаунт? Увійти
          </Link>
        </div>

        <div className="flex justify-center mt-6"><DangrowBadge /></div>
      </div>
    </div>
  );
}
