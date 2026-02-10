import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronLeft, FileText, Receipt, RotateCcw, FileCheck } from "lucide-react";

export const metadata: Metadata = { title: "Документи" };

const DOC_TYPE_MAP: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  sale: { label: "Реалізація", icon: Receipt, color: "#4ade80" },
  return: { label: "Повернення", icon: RotateCcw, color: "#f87171" },
  invoice: { label: "Рахунок", icon: FileCheck, color: "#60a5fa" },
};

const PAY_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: "Оплачено", color: "#16a34a", bg: "#f0fdf4" },
  pending: { label: "Очікує", color: "#d97706", bg: "#fffbeb" },
  partial: { label: "Частково", color: "#2563eb", bg: "#eff6ff" },
  failed: { label: "Помилка", color: "#dc2626", bg: "#fef2f2" },
};

function fmtPrice(n: number) {
  return n.toLocaleString("uk-UA", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " ₴";
}

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get profile's external_id to find documents
  const { data: profile } = await supabase
    .from("profiles")
    .select("external_id")
    .eq("id", user.id)
    .single();

  let documents: Array<{
    id: string;
    doc_type: string;
    doc_number: string;
    doc_date: string;
    total_amount: number;
    discount_amount: number;
    payment_status: string;
    ttn_number: string | null;
    items: unknown;
    created_at: string;
  }> = [];

  if (profile?.external_id) {
    const { data } = await supabase
      .from("documents")
      .select("id, doc_type, doc_number, doc_date, total_amount, discount_amount, payment_status, ttn_number, items, created_at")
      .eq("customer_external_id", profile.external_id)
      .order("doc_date", { ascending: false })
      .limit(50);
    documents = data || [];
  }

  // Also try by profile_id
  if (documents.length === 0) {
    const { data } = await supabase
      .from("documents")
      .select("id, doc_type, doc_number, doc_date, total_amount, discount_amount, payment_status, ttn_number, items, created_at")
      .eq("profile_id", user.id)
      .order("doc_date", { ascending: false })
      .limit(50);
    documents = data || [];
  }

  return (
    <div className="mx-auto max-w-[800px] px-4 py-8 sm:px-6">
      <Link href="/account" className="inline-flex items-center gap-1 text-sm text-[var(--t2)] mb-4 hover:text-dark">
        <ChevronLeft className="w-4 h-4" /> Мій акаунт
      </Link>

      <h1 className="font-unbounded text-2xl font-black text-dark">Документи</h1>
      <p className="text-sm text-[var(--t2)] mt-1">Накладні, рахунки та повернення з 1С</p>

      {documents.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-[var(--t3)]" />
          <p className="text-[var(--t2)]">Документів поки немає</p>
          <p className="text-xs text-[var(--t3)] mt-1">Вони з&apos;являться після синхронізації з 1С</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {documents.map((doc) => {
            const dt = DOC_TYPE_MAP[doc.doc_type] || DOC_TYPE_MAP.sale;
            const ps = PAY_STATUS[doc.payment_status] || PAY_STATUS.pending;
            const Icon = dt.icon;

            return (
              <div key={doc.id} className="rounded-2xl border border-[var(--border)] bg-white p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${dt.color}15`, color: dt.color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-dark">{dt.label}</span>
                      <span className="text-xs text-[var(--t2)]">#{doc.doc_number}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: ps.color, background: ps.bg }}>{ps.label}</span>
                    </div>
                    <p className="text-xs text-[var(--t2)] mt-0.5">
                      {new Date(doc.doc_date).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    {doc.ttn_number && (
                      <a href={`https://novaposhta.ua/tracking/?cargo_number=${doc.ttn_number}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-violet hover:underline mt-1 inline-block">
                        ТТН: {doc.ttn_number}
                      </a>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-dark">{fmtPrice(Number(doc.total_amount))}</p>
                    {Number(doc.discount_amount) > 0 && (
                      <p className="text-xs text-[var(--t3)]">Знижка: {fmtPrice(Number(doc.discount_amount))}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
