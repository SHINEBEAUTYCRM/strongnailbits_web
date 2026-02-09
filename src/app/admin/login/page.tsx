"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Заповніть всі поля"); return; }
    setLoading(true); setError("");
    setTimeout(() => { router.push("/admin"); setLoading(false); }, 500);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "#08080c" }}>
      <div className="w-full max-w-[400px] mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-wider mb-2"><span style={{ color: "#a855f7" }}>SHINE</span> <span style={{ color: "#71717a" }}>ADMIN</span></h1>
          <p className="text-sm" style={{ color: "#52525b" }}>Увійдіть в панель управління</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl p-6" style={{ background: "#0c0c12", border: "1px solid #1e1e2a" }}>
          {error && <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm" style={{ background: "#1c1017", border: "1px solid #7f1d1d", color: "#ef4444" }}><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#71717a" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@shineshop.com" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: "#111116", border: "1px solid #1e1e2a", color: "#e4e4e7" }} />
          </div>
          <div className="mb-6">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#71717a" }}>Пароль</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none pr-10" style={{ background: "#111116", border: "1px solid #1e1e2a", color: "#e4e4e7" }} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#52525b" }}>{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: "#7c3aed" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Увійти
          </button>
        </form>
      </div>
    </div>
  );
}
