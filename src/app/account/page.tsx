import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/auth/ProfileForm";
import Link from "next/link";
import { Package, LogOut, Heart, ChevronRight } from "lucide-react";

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
      <p className="mt-1 text-sm text-[var(--t2)]">{user.email}</p>

      {/* Quick links */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
          }}
        />
      </div>
    </div>
  );
}
