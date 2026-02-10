import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronLeft, Star, TrendingUp, TrendingDown } from "lucide-react";

export const metadata: Metadata = { title: "Бонуси" };

export default async function BonusesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("loyalty_points, loyalty_tier")
    .eq("id", user.id)
    .single();

  const { data: bonuses } = await supabase
    .from("bonuses")
    .select("id, type, amount, reason, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const points = Number(profile?.loyalty_points ?? 0);
  const tier = profile?.loyalty_tier || "bronze";

  const tierLabels: Record<string, { label: string; color: string }> = {
    bronze: { label: "Бронза", color: "#cd7f32" },
    silver: { label: "Срібло", color: "#c0c0c0" },
    gold: { label: "Золото", color: "#ffd700" },
    platinum: { label: "Платина", color: "#e5e4e2" },
  };
  const t = tierLabels[tier] || tierLabels.bronze;

  return (
    <div className="mx-auto max-w-[800px] px-4 py-8 sm:px-6">
      <Link href="/account" className="inline-flex items-center gap-1 text-sm text-[var(--t2)] mb-4 hover:text-dark">
        <ChevronLeft className="w-4 h-4" /> Мій акаунт
      </Link>

      <h1 className="font-unbounded text-2xl font-black text-dark">Бонусна програма</h1>

      {/* Balance card */}
      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--t2)]">Ваш баланс</p>
            <p className="text-4xl font-bold text-dark mt-1">{points.toFixed(0)} <span className="text-lg text-[var(--t2)]">балів</span></p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[var(--t2)]">Рівень</p>
            <p className="text-lg font-semibold mt-1" style={{ color: t.color }}>{t.label}</p>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-dark">Історія операцій</h2>
        </div>
        {!bonuses || bonuses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Star className="w-10 h-10 mx-auto mb-3 text-[var(--t3)]" />
            <p className="text-[var(--t2)]">Операцій поки немає</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {bonuses.map((b) => (
              <div key={b.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={b.type === "accrual"
                    ? { background: "#f0fdf4", color: "#16a34a" }
                    : { background: "#fef2f2", color: "#dc2626" }}>
                  {b.type === "accrual" ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark">
                    {b.type === "accrual" ? "Нарахування" : "Списання"}
                  </p>
                  {b.reason && <p className="text-xs text-[var(--t2)] truncate">{b.reason}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold" style={{ color: b.type === "accrual" ? "#16a34a" : "#dc2626" }}>
                    {b.type === "accrual" ? "+" : "−"}{Math.abs(Number(b.amount)).toFixed(0)}
                  </p>
                  <p className="text-[10px] text-[var(--t3)]">
                    {new Date(b.created_at).toLocaleDateString("uk-UA")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
