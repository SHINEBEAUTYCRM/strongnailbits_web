"use client";

import { useState } from "react";
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DangrowBadge } from "@/components/admin/DangrowBadge";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Введіть email"); return; }
    setLoading(true); setError("");

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/reset-password/confirm`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSent(true);
    } catch (err) {
      console.error('[ResetPassword] Request failed:', err);
      setError("Помилка мережі");
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "#08080c" }}>
        <div className="w-full max-w-[400px] mx-4 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#052e16", border: "1px solid #166534" }}>
            <CheckCircle className="w-8 h-8" style={{ color: "#4ade80" }} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "#f4f4f5" }}>Лист надіслано</h2>
          <p className="text-sm mb-1" style={{ color: "#a1a1aa" }}>Перевірте пошту <strong style={{ color: "#e4e4e7" }}>{email}</strong></p>
          <p className="text-sm mb-6" style={{ color: "#52525b" }}>Натисніть на посилання у листі для зміни пароля.</p>
          <Link href="/admin/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#7c3aed" }}>
            <ArrowLeft className="w-4 h-4" /> До входу
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
            <span style={{ color: "#a855f7" }}>StrongNailBits</span>{" "}
            <span style={{ color: "#52525b", fontSize: "14px", letterSpacing: "0.15em" }}>OPERATING SYSTEM</span>
          </h1>
          <p className="text-sm" style={{ color: "#52525b" }}>Відновлення пароля</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl p-6" style={{ background: "#0c0c12", border: "1px solid #1e1e2a" }}>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4 text-sm" style={{ background: "#1c1017", border: "1px solid #7f1d1d", color: "#ef4444" }}>
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          <p className="text-sm mb-4" style={{ color: "#a1a1aa" }}>
            Введіть email вашого акаунту. Ми надішлемо посилання для зміни пароля.
          </p>

          <div className="mb-5">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#71717a" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@strongnailbits.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{ background: "#111116", border: "1px solid #1e1e2a", color: "#e4e4e7" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#1e1e2a"; }} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "#7c3aed" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Надіслати посилання
          </button>
        </form>

        <div className="text-center mt-4">
          <Link href="/admin/login" className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#52525b" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Повернутись до входу
          </Link>
        </div>

        <div className="flex justify-center mt-6"><DangrowBadge /></div>
      </div>
    </div>
  );
}
