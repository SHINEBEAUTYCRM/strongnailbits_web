import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/auth/ProfileForm";
import Link from "next/link";
import { Package, LogOut, Heart, ChevronRight, Star, FileText, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "Мій акаунт",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { count: orderCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id);

  return (
    <div className="mx-auto max-w-[800px] px-4 py-8 sm:px-6">
      <h1 className="font-unbounded text-2xl font-black text-dark">
        Мій акаунт
      </h1>
      {profile?.phone ? (
        <p className="mt-1 text-sm text-[var(--t2)]">
          {`+${profile.phone.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})(\d{2})$/, "$1 ($2) $3-$4-$5")}`}
        </p>
      ) : (
        !user.email?.includes("@phone.shineshop.local") && (
          <p className="mt-1 text-sm text-[var(--t2)]">{user.email}</p>
        )
      )}

      {/* B2B info banner */}
      {profile?.is_b2b && (
        <div className="mt-6 rounded-2xl border border-violet/20 bg-violet/5 p-5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet/10 text-violet">B2B</span>
            {profile.company && <span className="text-sm font-medium text-dark">{profile.company}</span>}
            {profile.manager_name && <span className="text-xs text-[var(--t2)]">Менеджер: {profile.manager_name}</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-[10px] uppercase text-[var(--t3)]">Бонуси</p>
              <p className="text-lg font-bold text-dark">{Number(profile.loyalty_points ?? 0).toFixed(0)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[var(--t3)]">Баланс</p>
              <p className="text-lg font-bold" style={{ color: Number(profile.balance ?? 0) < 0 ? "#dc2626" : "#16a34a" }}>
                {Number(profile.balance ?? 0).toLocaleString("uk-UA")} ₴
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[var(--t3)]">Кредит ліміт</p>
              <p className="text-lg font-bold text-dark">{Number(profile.credit_limit ?? 0).toLocaleString("uk-UA")} ₴</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[var(--t3)]">Знижка</p>
              <p className="text-lg font-bold text-dark">{Number(profile.discount_percent ?? 0)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/account/orders"
          className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral">
            <Package size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-dark">Замовлення</div>
            <div className="text-xs text-[var(--t3)]">
              {orderCount ?? 0} замовлень
            </div>
          </div>
          <ChevronRight size={16} className="text-[var(--t3)]" />
        </Link>

        <Link
          href="/account/bonuses"
          className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber/10 text-amber">
            <Star size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-dark">Бонуси</div>
            <div className="text-xs text-[var(--t3)]">
              {Number(profile?.loyalty_points ?? 0).toFixed(0)} балів
            </div>
          </div>
          <ChevronRight size={16} className="text-[var(--t3)]" />
        </Link>

        <Link
          href="/account/documents"
          className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue/10 text-blue">
            <FileText size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-dark">Документи</div>
            <div className="text-xs text-[var(--t3)]">Накладні з 1С</div>
          </div>
          <ChevronRight size={16} className="text-[var(--t3)]" />
        </Link>

        <Link
          href="/wishlist"
          className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral">
            <Heart size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-dark">Обране</div>
            <div className="text-xs text-[var(--t3)]">Список бажань</div>
          </div>
          <ChevronRight size={16} className="text-[var(--t3)]" />
        </Link>

        {profile?.is_b2b && (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green/10 text-green">
              <Wallet size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-dark">Взаєморозрахунки</div>
              <div className="text-xs text-[var(--t3)]">
                Баланс: {Number(profile.balance ?? 0).toLocaleString("uk-UA")} ₴
              </div>
            </div>
          </div>
        )}

        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red/10 text-red">
              <LogOut size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-dark">Вийти</div>
              <div className="text-xs text-[var(--t3)]">Завершити сесію</div>
            </div>
          </button>
        </form>
      </div>

      {/* Profile form */}
      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-white p-6">
        <h2 className="font-unbounded mb-4 text-sm font-bold text-dark">
          Особисті дані
        </h2>
        <ProfileForm
          userId={user.id}
          initialData={{
            firstName: profile?.first_name || "",
            lastName: profile?.last_name || "",
            phone: profile?.phone || "",
            company: profile?.company || "",
            email: profile?.email || "",
            city: profile?.city || "",
            npBranch: profile?.np_branch || "",
            address: profile?.address || "",
          }}
        />
      </div>
    </div>
  );
}
