"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DangrowBadge } from "@/components/admin/DangrowBadge";

export default function ConfirmResetPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase will set the session from the URL hash automatically
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    // Check if session already exists (user came from recovery link)
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: unknown } }) => {
      if (session) setReady(true);
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError("Введіть новий пароль"); return; }
    if (password.length < 6) { setError("Мінімум 6 символів"); return; }
    if (password !== confirm) { setError("Паролі не співпадають"); return; }
    setLoading(true); setError("");

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/admin");
      }, 2000);
    } catch (err) {
      console.error('[ResetPassword] Confirm failed:', err);
      setError("Помилка мережі");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "#08080c" }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#052e16", border: "1px solid #166534" }}>
            <CheckCircle className="w-8 h-8" style={{ color: "#4ade80" }} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "#f4f4f5" }}>Пароль змінено</h2>
          <p className="text-sm" style={{ color: "#52525b" }}>Перенаправляємо в адмінку...</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "#08080c" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#a855f7" }} />
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
          <p className="text-sm" style={{ color: "#52525b" }}>Новий пароль</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl p-6" style={{ background: "#0c0c12", border: "1px solid #1e1e2a" }}>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4 text-sm" style={{ background: "#1c1017", border: "1px solid #7f1d1d", color: "#ef4444" }}>
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#71717a" }}>Новий пароль</label>
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

          <div className="mb-6">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#71717a" }}>Підтвердіть пароль</label>
            <input type={showPw ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Повторіть пароль"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{ background: "#111116", border: "1px solid #1e1e2a", color: "#e4e4e7" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#1e1e2a"; }} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "#7c3aed" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Змінити пароль
          </button>
        </form>

        <div className="flex justify-center mt-6"><DangrowBadge /></div>
      </div>
    </div>
  );
}
