"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield, ShieldCheck, ShieldX, UserCog, Loader2,
  CheckCircle, XCircle, Crown, Clock,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  admin_approved: boolean;
  is_active: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch { setError("Помилка завантаження"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const doAction = async (action: string, id: string, extra?: Record<string, string>) => {
    setActionLoading(id);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, ...extra }),
      });
      const data = await res.json();
      if (!data.ok) setError(data.error || "Помилка");
      else await fetchUsers();
    } catch { setError("Помилка мережі"); }
    setActionLoading(null);
  };

  const pending = users.filter((u) => !u.admin_approved);
  const approved = users.filter((u) => u.admin_approved);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1 flex items-center gap-3" style={{ color: "#f4f4f5" }}>
          <Shield className="w-6 h-6" style={{ color: "#a855f7" }} />
          Користувачі адмінки
        </h1>
        <p className="text-sm" style={{ color: "#52525b" }}>
          Контроль доступу: одобрення, блокування, зміна ролей
        </p>
      </div>

      {error && <div className="mb-4 px-4 py-2.5 rounded-lg text-sm" style={{ color: "#f87171", background: "#450a0a", border: "1px solid #7f1d1d" }}>{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#a855f7" }} />
        </div>
      ) : (
        <>
          {/* Pending approval */}
          {pending.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: "#fbbf24" }}>
                <Clock className="w-4 h-4" /> Очікують підтвердження ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map((u) => (
                  <div key={u.id} className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    style={{ background: "#1a1400", border: "1px solid #854d0e" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "#fbbf24" }}>
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-xs" style={{ color: "#a16207" }}>{u.email}</p>
                      <p className="text-[10px] mt-1" style={{ color: "#713f12" }}>
                        Зареєстровано: {new Date(u.created_at).toLocaleDateString("uk-UA")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => doAction("approve", u.id)} disabled={actionLoading === u.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium"
                        style={{ background: "#052e16", color: "#4ade80", border: "1px solid #166534" }}>
                        {actionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Одобрити
                      </button>
                      <button onClick={() => doAction("remove", u.id)} disabled={actionLoading === u.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium"
                        style={{ background: "#450a0a", color: "#f87171", border: "1px solid #7f1d1d" }}>
                        <XCircle className="w-3.5 h-3.5" /> Відхилити
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active users */}
          <div>
            <h2 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: "#a1a1aa" }}>
              <ShieldCheck className="w-4 h-4" style={{ color: "#4ade80" }} /> Активні ({approved.length})
            </h2>
            {approved.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}>
                <p style={{ color: "#3f3f46" }}>Немає активних адмін-користувачів</p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e1e2a" }}>
                      <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Користувач</th>
                      <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Роль</th>
                      <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Дата</th>
                      <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approved.map((u) => (
                      <tr key={u.id} className="hover:bg-[#111118] transition-colors" style={{ borderBottom: "1px solid #141420" }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ background: u.role === "admin" ? "#7c3aed" : "#1e3a5f" }}>
                              {(u.first_name?.[0] || u.email[0]).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm" style={{ color: "#e4e4e7" }}>{u.first_name} {u.last_name}</p>
                              <p className="text-[11px]" style={{ color: "#52525b" }}>{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium"
                            style={u.role === "admin" ? { color: "#a855f7", background: "#1e1030" } : { color: "#60a5fa", background: "#172554" }}>
                            {u.role === "admin" ? <Crown className="w-3 h-3" /> : <UserCog className="w-3 h-3" />}
                            {u.role === "admin" ? "Адмін" : "Менеджер"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs" style={{ color: "#52525b" }}>
                          {new Date(u.created_at).toLocaleDateString("uk-UA")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            {u.role === "manager" && (
                              <button onClick={() => doAction("set-role", u.id, { role: "admin" })} disabled={actionLoading === u.id}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                                style={{ color: "#a855f7", background: "#141420", border: "1px solid #1e1e2a" }}
                                title="Підвищити до адміна">
                                ↑ Адмін
                              </button>
                            )}
                            {u.role === "admin" && (
                              <button onClick={() => doAction("set-role", u.id, { role: "manager" })} disabled={actionLoading === u.id}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                                style={{ color: "#60a5fa", background: "#141420", border: "1px solid #1e1e2a" }}
                                title="Понизити до менеджера">
                                ↓ Менеджер
                              </button>
                            )}
                            <button onClick={() => doAction("block", u.id)} disabled={actionLoading === u.id}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                              style={{ color: "#f87171", background: "#141420", border: "1px solid #1e1e2a" }}
                              title="Заблокувати">
                              <ShieldX className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
